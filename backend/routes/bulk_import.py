from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit, next_code
import json
from datetime import datetime
import re

bulk_import_bp = Blueprint("bulk_import", __name__)

# ---------- helpers ----------
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

def safe_int(v):
    try:
        return int(float(v)) if v and v != '' else None
    except:
        return None

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
    return safe_int(age_str)

def parse_date(v):
    if not v:
        return None
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(v, fmt).date().isoformat()
        except:
            continue
    return None

def parse_datetime(v):
    if not v:
        return None
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%d-%m-%Y %H:%M"):
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

def find_user(user_name):
    if not user_name:
        return None
    user = query("SELECT id FROM users WHERE name LIKE %s", (f"%{user_name}%",))
    if user:
        return user["id"]
    return None

# ---------- OP import ----------
@bulk_import_bp.route("/op-import", methods=["POST"])
@jwt_required()
def import_op():
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"error": "Expected array of rows"}), 400

    imported = 0
    errors = []

    # Cache patients by phone, patient_uid (MR Number), and reg_no (Patient Reg No)
    patient_by_phone = {}
    patient_by_uid = {}
    patient_by_regno = {}
    existing = query("SELECT id, phone, patient_uid, reg_no FROM patients", many=True)
    for p in existing:
        if p.get("phone"):
            patient_by_phone[p["phone"]] = p["id"]
        if p.get("patient_uid"):
            patient_by_uid[p["patient_uid"]] = p["id"]
        if p.get("reg_no"):
            patient_by_regno[p["reg_no"]] = p["id"]

    for idx, row in enumerate(data):
        try:
            created_at_str = safe_str(row.get("CreatedAt"))
            bill_no = safe_str(row.get("Bill.No"), max_len=50)
            mr_number = safe_str(row.get("MR Number"), max_len=30)          # patient_uid
            patient_reg_no = safe_str(row.get("Patient Reg No"), max_len=30) # reg_no
            patient_name = safe_str(row.get("Patient Name"))
            phone = safe_str(row.get("Phone"), max_len=30)
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

            if not patient_name:
                errors.append(f"Row {idx+1}: Patient Name is required")
                continue

            if not bill_no:
                bill_no = next_code("OPB", "op_bills", "bill_no")

            # --- Find or create patient ---
            patient_id = None
            # Try by MR Number first, then Patient Reg No, then phone
            if mr_number and mr_number in patient_by_uid:
                patient_id = patient_by_uid[mr_number]
            elif patient_reg_no and patient_reg_no in patient_by_regno:
                patient_id = patient_by_regno[patient_reg_no]
            elif phone and phone in patient_by_phone:
                patient_id = patient_by_phone[phone]

            if not patient_id:
                # Use MR Number as patient_uid, Patient Reg No as reg_no
                patient_uid = mr_number or next_code("PT", "patients", "patient_uid")
                reg_no = patient_reg_no  # use CSV value, may be None
                if not reg_no:
                    reg_no = next_code("SGR", "patients", "reg_no")  # fallback if missing
                patient_uid = patient_uid[:30]
                reg_no = reg_no[:30]
                gender = 'Male'
                if gender_age and '/' in gender_age:
                    parts = gender_age.split('/')
                    if len(parts) == 2:
                        gender = parts[1].strip()
                age = parse_age(gender_age)
                dob = parse_date(dob_str) if dob_str else None
                if dob and age is None:
                    today = datetime.today().date()
                    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

                try:
                    pid = query("""
                        INSERT INTO patients (patient_uid, reg_no, name, gender, age, dob, phone, village)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (patient_uid, reg_no, patient_name, gender, age, dob, phone, area),
                    fetch=False, commit=True)
                    patient_id = pid
                    if phone:
                        patient_by_phone[phone] = patient_id
                    if patient_uid:
                        patient_by_uid[patient_uid] = patient_id
                    if reg_no:
                        patient_by_regno[reg_no] = patient_id
                except Exception as e:
                    errors.append(f"Row {idx+1}: Failed to insert patient: {str(e)}")
                    continue

            # --- Doctor ---
            doctor_id = find_doctor(doctor_name)

            # --- Dates ---
            appointment_date = parse_date(date_str) or datetime.today().date().isoformat()
            created_at = parse_datetime(created_at_str) or datetime.now().isoformat()

            # --- OP Registration ---
            # Use CSV's Patient Reg No as opd_reg_no, or generate if missing
            opd_reg_no = patient_reg_no or next_code("OP", "op_registrations", "opd_reg_no")
            token_row = query("SELECT MAX(token_no) as max_token FROM op_registrations WHERE DATE(created_at)=CURDATE()")
            token_no = (token_row["max_token"] or 0) + 1

            valid_referral_types = ['Walkin','Online','Doctor','Hospital User','Other','Camp','Ads','Friend/Family','Marketing']
            referral_type = referral if referral in valid_referral_types else 'Walkin'
            mobile = (phone or '')[:30]

            try:
                op_reg_id = query("""
                    INSERT INTO op_registrations
                    (patient_id, opd_reg_no, token_no, first_name, last_name, gender, dob, mobile,
                     doctor_id, consultation_fee, referral_type, appointment_date, created_by, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (patient_id, opd_reg_no, token_no, patient_name, '', gender, dob, mobile,
                      doctor_id, 0, referral_type, appointment_date, 1, created_at),
                fetch=False, commit=True)
            except Exception as e:
                errors.append(f"Row {idx+1}: Failed to create OP registration: {str(e)}")
                continue

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

            # --- Bill (appointment_id = NULL) ---
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
                bill_no = bill_no[:50]
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

# ---------- OP export (unchanged) ----------
@bulk_import_bp.route("/op-export", methods=["GET"])
@jwt_required()
def export_op():
    rows = query("""
        SELECT b.created_at AS CreatedAt,
               b.bill_no AS `Bill.No`,
               p.patient_uid AS `MR Number`,
               r.opd_reg_no AS `Patient Reg No`,
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
        LEFT JOIN op_registrations r ON r.id = b.appointment_id   -- appointment_id is NULL, so we may need to join differently
        LEFT JOIN doctors d ON d.id = r.doctor_id
        ORDER BY b.id DESC
    """, many=True)
    return jsonify(rows)

# ---------- Lab import ----------
@bulk_import_bp.route("/lab-import", methods=["POST"])
@jwt_required()
def import_lab():
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"error": "Expected array of rows"}), 400

    imported = 0
    errors = []

    patient_by_phone = {}
    patient_by_uid = {}
    patient_by_regno = {}
    existing = query("SELECT id, phone, patient_uid, reg_no FROM patients", many=True)
    for p in existing:
        if p.get("phone"):
            patient_by_phone[p["phone"]] = p["id"]
        if p.get("patient_uid"):
            patient_by_uid[p["patient_uid"]] = p["id"]
        if p.get("reg_no"):
            patient_by_regno[p["reg_no"]] = p["id"]

    for idx, row in enumerate(data):
        try:
            date_str = safe_str(row.get("Date"))
            mr_number = safe_str(row.get("MR Number"), max_len=30)
            patient_reg_no = safe_str(row.get("Patient Reg.No"), max_len=30)  # reg_no and also opd_reg_no
            patient_name = safe_str(row.get("Patient Name"))
            gender = safe_str(row.get("Gender"), max_len=10)
            age_str = safe_str(row.get("Age"))
            phone = safe_str(row.get("Phone"), max_len=30)
            doctor_name = safe_str(row.get("Doctor Name"))
            invoice_no = safe_str(row.get("Invoice No"), max_len=50)
            investigations = safe_str(row.get("Investigations"))
            ref_amount = safe_float(row.get("Ref Amount"))
            total_amount = safe_float(row.get("Total Amount"))
            discount = safe_float(row.get("Discount"))
            due_discount = safe_float(row.get("Due Discount"))
            bill_amount = safe_float(row.get("BillAmount"))
            paid_amount = safe_float(row.get("PaidAmount"))
            due_amount = safe_float(row.get("Due Amount"))
            pay_mode = safe_str(row.get("Pay Mode"), max_len=20)
            user_name = safe_str(row.get("User Name"))
            referral_type = safe_str(row.get("Referral Type"))
            referral_doctor = safe_str(row.get("Referral Doctor"))

            if not patient_name:
                errors.append(f"Row {idx+1}: Patient Name is required")
                continue

            if not invoice_no:
                invoice_no = next_code("OPB", "op_bills", "bill_no")

            # --- Patient ---
            patient_id = None
            # Try by MR Number first, then Patient Reg No, then phone
            if mr_number and mr_number in patient_by_uid:
                patient_id = patient_by_uid[mr_number]
            elif patient_reg_no and patient_reg_no in patient_by_regno:
                patient_id = patient_by_regno[patient_reg_no]
            elif phone and phone in patient_by_phone:
                patient_id = patient_by_phone[phone]

            if not patient_id:
                patient_uid = mr_number or next_code("PT", "patients", "patient_uid")
                reg_no = patient_reg_no  # use CSV value
                if not reg_no:
                    reg_no = next_code("SGR", "patients", "reg_no")
                patient_uid = patient_uid[:30]
                reg_no = reg_no[:30]
                if not gender:
                    gender = 'Male'
                age = parse_age(age_str)
                try:
                    pid = query("""
                        INSERT INTO patients (patient_uid, reg_no, name, gender, age, phone)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (patient_uid, reg_no, patient_name, gender, age, phone),
                    fetch=False, commit=True)
                    patient_id = pid
                    if phone:
                        patient_by_phone[phone] = patient_id
                    if patient_uid:
                        patient_by_uid[patient_uid] = patient_id
                    if reg_no:
                        patient_by_regno[reg_no] = patient_id
                except Exception as e:
                    errors.append(f"Row {idx+1}: Failed to insert patient: {str(e)}")
                    continue

            # --- Doctor ---
            doctor_id = find_doctor(doctor_name)

            # --- User (created_by) ---
            created_by = find_user(user_name) or 1

            # --- Date ---
            appointment_date = parse_date(date_str) or datetime.today().date().isoformat()

            # --- OP Registration ---
            opd_reg_no = patient_reg_no or next_code("OP", "op_registrations", "opd_reg_no")
            token_row = query("SELECT MAX(token_no) as max_token FROM op_registrations WHERE DATE(created_at)=CURDATE()")
            token_no = (token_row["max_token"] or 0) + 1

            valid_referral_types = ['Walkin','Online','Doctor','Hospital User','Other','Camp','Ads','Friend/Family','Marketing']
            ref_type = referral_type if referral_type in valid_referral_types else 'Walkin'
            ref_doc = referral_doctor if referral_doctor else None

            try:
                op_reg_id = query("""
                    INSERT INTO op_registrations
                    (patient_id, opd_reg_no, token_no, first_name, last_name, gender, mobile,
                     doctor_id, referral_type, referral_doctor_name, appointment_date, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (patient_id, opd_reg_no, token_no, patient_name, '', gender, phone,
                      doctor_id, ref_type, ref_doc, appointment_date, created_by),
                fetch=False, commit=True)
            except Exception as e:
                errors.append(f"Row {idx+1}: Failed to create OP registration: {str(e)}")
                continue

            # --- Bill ---
            if bill_amount == 0 and total_amount > 0:
                net_total = total_amount - discount
            else:
                net_total = bill_amount

            payment_mode = pay_mode or 'Cash'
            valid_modes = ['Cash','Card','UPI','Insurance','Credit','Bank','Cheque','NEFT']
            if payment_mode not in valid_modes:
                payment_mode = 'Cash'

            if due_amount <= 0:
                status = 'Paid'
            elif paid_amount > 0:
                status = 'Partial'
            else:
                status = 'Due'

            bill_no = invoice_no[:50]
            remarks = investigations or ''

            query("""
                INSERT INTO op_bills
                (bill_no, patient_id, appointment_id, consultation_charge, lab_charge,
                 procedure_charge, service_charge, pharmacy_charge,
                 gross_total, discount, net_total,
                 paid_amount, due_amount, payment_mode, status,
                 referral_type, mlc, mlc_number, remarks, created_by, created_at)
                VALUES (%s, %s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (bill_no, patient_id, 0, net_total, 0, 0, 0,
                  total_amount, discount, net_total,
                  paid_amount, due_amount, payment_mode, status,
                  ref_type, 0, '', remarks, created_by),
            fetch=False, commit=True)

            imported += 1

        except Exception as e:
            errors.append(f"Row {idx+1}: {str(e)}")
            continue

    log_audit(get_jwt_identity(), "IMPORT_LAB", "Bulk Lab Import", 0, f"Imported {imported} lab bills")
    return jsonify({"imported": imported, "errors": errors}), 201

# ---------- Lab export ----------
@bulk_import_bp.route("/lab-export", methods=["GET"])
@jwt_required()
def export_lab():
    rows = query("""
        SELECT
            DATE(b.created_at) AS `Date`,
            p.patient_uid AS `MR Number`,
            r.opd_reg_no AS `Patient Reg.No`,
            p.name AS `Patient Name`,
            p.gender AS Gender,
            p.age AS Age,
            p.phone AS Phone,
            d.name AS `Doctor Name`,
            b.bill_no AS `Invoice No`,
            b.remarks AS Investigations,
            0 AS `Ref Amount`,
            b.gross_total AS `Total Amount`,
            b.discount AS Discount,
            0 AS `Due Discount`,
            b.net_total AS BillAmount,
            b.paid_amount AS PaidAmount,
            b.due_amount AS `Due Amount`,
            b.payment_mode AS `Pay Mode`,
            u.name AS `User Name`,
            b.referral_type AS `Referral Type`,
            r.referral_doctor_name AS `Referral Doctor`
        FROM op_bills b
        JOIN patients p ON p.id = b.patient_id
        LEFT JOIN op_registrations r ON r.id = b.appointment_id
        LEFT JOIN doctors d ON d.id = r.doctor_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.lab_charge > 0
        ORDER BY b.id DESC
    """, many=True)
    return jsonify(rows)