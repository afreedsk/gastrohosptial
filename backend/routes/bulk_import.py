from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit, next_code
import json
from datetime import datetime
import re

bulk_import_bp = Blueprint("bulk_import", __name__)

def safe_str(v, max_len=None):
    if v is None:
        return None
    if isinstance(v, str):
        val = v.strip()
    else:
        val = str(v).strip()
    if max_len and len(val) > max_len:
        val = val[:max_len]
    return val if val else None

def safe_float(v):
    try:
        return float(v) if v and v != '' else 0.0
    except:
        return 0.0

def parse_age(age_str):
    if not age_str:
        return None
    age_str = age_str.strip()
    match = re.search(r'(\d+)\s*Y', age_str, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r'(\d+)\s*M', age_str, re.IGNORECASE)
    if match:
        months = int(match.group(1))
        return months // 12
    match = re.search(r'(\d+)\s*D', age_str, re.IGNORECASE)
    if match:
        days = int(match.group(1))
        return days // 365
    try:
        return int(float(age_str))
    except:
        return None

def parse_date(v):
    if not v:
        return None
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(v, fmt).date().isoformat()
        except:
            continue
    return None

def parse_datetime(v):
    if not v:
        return None
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(v, fmt).isoformat()
        except:
            continue
    return None

def find_doctor(doctor_name):
    if not doctor_name:
        return None
    doctor = query("SELECT id FROM doctors WHERE name LIKE %s", (f"%{doctor_name}%",))
    if doctor:
        return doctor["id"]
    did = query("INSERT INTO doctors (name) VALUES (%s)", (doctor_name,), fetch=False, commit=True)
    return did

@bulk_import_bp.route("/op-import", methods=["POST"])
@jwt_required()
def import_op():
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"error": "Expected array of rows"}), 400

    imported = 0
    errors = []

    patient_by_phone = {}
    patient_by_regno = {}
    existing = query("SELECT id, phone, reg_no FROM patients", many=True)
    for p in existing:
        if p.get("phone"):
            patient_by_phone[p["phone"]] = p["id"]
        if p.get("reg_no"):
            patient_by_regno[p["reg_no"]] = p["id"]

    for idx, row in enumerate(data):
        try:
            # --- Extract with truncation ---
            created_at_str = safe_str(row.get("CreatedAt"))
            bill_no = safe_str(row.get("Bill.No"), max_len=50)
            mr_number = safe_str(row.get("MR Number"), max_len=30)          # patient_uid
            patient_reg_no = safe_str(row.get("Patient Reg No"), max_len=30) # reg_no
            patient_name = safe_str(row.get("Patient Name"))
            phone = safe_str(row.get("Phone"), max_len=30)                   # phone
            gender_age = safe_str(row.get("Age/Gender"))
            dob_str = safe_str(row.get("DOB"))
            area = safe_str(row.get("Area"))
            doctor_name = safe_str(row.get("Doctor Name"))
            date_str = safe_str(row.get("Date"))
            service = safe_str(row.get("Service"))
            cash = safe_float(row.get("Cash"))
            card = safe_float(row.get("Card"))
            upi = safe_float(row.get("UPI"))
            bank = safe_float(row.get("Bank"))
            total = safe_float(row.get("Total"))
            referral = safe_str(row.get("Referral"))
            mlc = safe_str(row.get("MLC Patient"))
            mlc_number = safe_str(row.get("MLC Number"))
            remarks = safe_str(row.get("Remarks"))

            if not bill_no:
                errors.append(f"Row {idx+1}: Bill.No is required")
                continue
            if not patient_name:
                errors.append(f"Row {idx+1}: Patient Name is required")
                continue

            # --- Find or create patient ---
            patient_id = None
            if phone and phone in patient_by_phone:
                patient_id = patient_by_phone[phone]
            elif patient_reg_no and patient_reg_no in patient_by_regno:
                patient_id = patient_by_regno[patient_reg_no]

            if not patient_id:
                patient_uid = mr_number or next_code("PT", "patients", "patient_uid")
                reg_no = patient_reg_no or next_code("SGR", "patients", "reg_no")
                # Ensure patient_uid and reg_no are within limits
                patient_uid = patient_uid[:30]
                reg_no = reg_no[:30]
                gender = 'Male'
                if gender_age and '/' in gender_age:
                    parts = gender_age.split('/')
                    if len(parts) == 2:
                        gender = parts[1].strip()
                age = parse_age(gender_age)
                dob = parse_date(dob_str)
                if dob and age is None:
                    from datetime import date
                    y, m, d = map(int, dob.split('-'))
                    today = date.today()
                    age = today.year - y - ((today.month, today.day) < (m, d))

                pid = query("""
                    INSERT INTO patients (patient_uid, reg_no, name, gender, age, dob, phone, village)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (patient_uid, reg_no, patient_name, gender, age, dob, phone, area),
                fetch=False, commit=True)
                patient_id = pid
                if phone:
                    patient_by_phone[phone] = patient_id
                if reg_no:
                    patient_by_regno[reg_no] = patient_id

            # --- Doctor ---
            doctor_id = find_doctor(doctor_name)

            # --- Dates ---
            admission_date = parse_date(date_str) or datetime.today().date().isoformat()
            created_at = parse_datetime(created_at_str) or datetime.now().isoformat()

            # --- OP Registration ---
            opd_reg_no = next_code("OP", "op_registrations", "opd_reg_no")
            token_row = query("SELECT MAX(token_no) as max_token FROM op_registrations WHERE DATE(created_at)=CURDATE()")
            token_no = (token_row["max_token"] or 0) + 1

            valid_referral_types = ['Walkin','Online','Doctor','Hospital User','Other','Camp','Ads','Friend/Family','Marketing']
            referral_type = referral if referral in valid_referral_types else 'Walkin'

            # Ensure mobile is truncated
            mobile = (phone or '')[:30]

            op_reg_id = query("""
                INSERT INTO op_registrations
                (patient_id, opd_reg_no, token_no, first_name, last_name, gender, dob, mobile, doctor_id, consultation_fee, referral_type, appointment_date, created_by, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (patient_id, opd_reg_no, token_no, patient_name, '', gender, dob, mobile, doctor_id, 0, referral_type, admission_date, 1, created_at),
            fetch=False, commit=True)

            # --- Charges ---
            consultation_charge = 0
            service_charge = 0
            lab_charge = 0
            procedure_charge = 0
            pharmacy_charge = 0
            if service:
                svc_lower = service.lower()
                if 'consultation' in svc_lower:
                    consultation_charge = total
                elif 'lab' in svc_lower:
                    lab_charge = total
                elif 'procedure' in svc_lower:
                    procedure_charge = total
                elif 'pharmacy' in svc_lower or 'medicine' in svc_lower:
                    pharmacy_charge = total
                else:
                    service_charge = total

            # --- Payment ---
            payment_split = {"cash": cash, "card": card, "upi": upi, "bank": bank}
            payment_mode = 'Cash'
            if bank > 0:
                payment_mode = 'Bank'
            elif card > 0:
                payment_mode = 'Card'
            elif upi > 0:
                payment_mode = 'UPI'

            paid_amount = cash + card + upi + bank
            due_amount = max(0, total - paid_amount)
            status = 'Paid' if due_amount <= 0 else ('Partial' if paid_amount > 0 else 'Due')

            # --- Bill ---
            existing_bill = query("SELECT id FROM op_bills WHERE bill_no=%s", (bill_no,))
            if existing_bill:
                query("""
                    UPDATE op_bills
                    SET patient_id=%s, consultation_charge=%s, lab_charge=%s, procedure_charge=%s,
                        service_charge=%s, pharmacy_charge=%s, gross_total=%s, discount=0, net_total=%s,
                        paid_amount=%s, due_amount=%s, payment_mode=%s, status=%s,
                        payment_split=%s, referral_type=%s, mlc=%s, mlc_number=%s, remarks=%s,
                        created_at=%s
                    WHERE id=%s
                """, (patient_id, consultation_charge, lab_charge, procedure_charge, service_charge,
                      pharmacy_charge, total, total, paid_amount, due_amount, payment_mode, status,
                      json.dumps(payment_split), referral_type, 1 if mlc and mlc.lower() == 'yes' else 0,
                      mlc_number, remarks, created_at, existing_bill["id"]),
                fetch=False, commit=True)
            else:
                # Ensure bill_no is not too long
                bill_no = (bill_no or next_code("OPB", "op_bills", "bill_no"))[:50]
                query("""
                    INSERT INTO op_bills
                    (bill_no, patient_id, appointment_id, consultation_charge, lab_charge, procedure_charge,
                     service_charge, pharmacy_charge, gross_total, discount, net_total,
                     paid_amount, due_amount, payment_mode, status,
                     payment_split, referral_type, mlc, mlc_number, remarks, created_by, created_at)
                    VALUES (%s, %s, NULL, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (bill_no, patient_id, consultation_charge, lab_charge, procedure_charge,
                      service_charge, pharmacy_charge, total, total,
                      paid_amount, due_amount, payment_mode, status,
                      json.dumps(payment_split), referral_type, 1 if mlc and mlc.lower() == 'yes' else 0,
                      mlc_number, remarks, 1, created_at),
                fetch=False, commit=True)

            imported += 1

        except Exception as e:
            errors.append(f"Row {idx+1}: {str(e)}")
            continue

    log_audit(get_jwt_identity(), "IMPORT_OP", "Bulk Import", 0, f"Imported {imported} OP bills")
    return jsonify({"imported": imported, "errors": errors}), 201

@bulk_import_bp.route("/op-export", methods=["GET"])
@jwt_required()
def export_op():
    rows = query("""
        SELECT b.created_at AS CreatedAt,
               b.bill_no AS `Bill.No`,
               p.patient_uid AS `MR Number`,
               p.reg_no AS `Patient Reg No`,
               p.name AS `Patient Name`,
               p.phone AS Phone,
               CONCAT(p.age, 'Y / ', p.gender) AS `Age/Gender`,
               p.dob AS DOB,
               p.village AS Area,
               d.name AS `Doctor Name`,
               r.appointment_date AS Date,
               CONCAT_WS(', ',
                   IF(b.consultation_charge>0, 'Consultation Fee', NULL),
                   IF(b.lab_charge>0, 'Lab Fee', NULL),
                   IF(b.procedure_charge>0, 'Procedure Fee', NULL),
                   IF(b.service_charge>0, 'Service Fee', NULL),
                   IF(b.pharmacy_charge>0, 'Pharmacy Fee', NULL)
               ) AS Service,
               JSON_EXTRACT(b.payment_split, '$.cash') AS Cash,
               JSON_EXTRACT(b.payment_split, '$.card') AS Card,
               JSON_EXTRACT(b.payment_split, '$.upi') AS UPI,
               JSON_EXTRACT(b.payment_split, '$.bank') AS Bank,
               b.net_total AS Total,
               b.referral_type AS Referral,
               IF(b.mlc=1, 'Yes', 'No') AS `MLC Patient`,
               b.mlc_number AS `MLC Number`,
               b.remarks AS Remarks
        FROM op_bills b
        JOIN patients p ON p.id = b.patient_id
        LEFT JOIN op_registrations r ON r.id = b.appointment_id
        LEFT JOIN doctors d ON d.id = r.doctor_id
        ORDER BY b.id DESC
    """, many=True)
    return jsonify(rows)