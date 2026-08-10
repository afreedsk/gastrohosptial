from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

op_reg_bp = Blueprint("op_registrations", __name__)


def blank_to_none(v):
    """MySQL DATE/DECIMAL/INT columns reject '' — convert blank strings to NULL."""
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v


def calc_age(dob_str):
    if not dob_str:
        return None
    y, m, d = map(int, dob_str.split("-"))
    today = date.today()
    return today.year - y - ((today.month, today.day) < (m, d))


def next_token_for_today():
    row = query("""
        SELECT COUNT(*) c FROM op_registrations WHERE DATE(created_at) = CURDATE()
    """)
    return (row["c"] or 0) + 1


@op_reg_bp.route("", methods=["POST"])
@jwt_required()
def create_op_registration():
    d = request.get_json()
    if not d.get("first_name") or not d.get("mobile") or not d.get("gender"):
        return jsonify({"error": "first_name, mobile and gender are required"}), 400

    user_id = get_jwt_identity()
    full_name = f"{d.get('title', '')} {d.get('first_name')} {d.get('last_name', '')}".strip()

    dob = blank_to_none(d.get("dob"))
    age = calc_age(dob)

    # find-or-create the underlying patient record (by mobile) so repeat
    # visits share one MR Number instead of creating duplicate patients
    existing = query("SELECT * FROM patients WHERE phone=%s ORDER BY id DESC LIMIT 1", (d["mobile"],))
    if existing:
        patient_id = existing["id"]
        patient_uid = existing["patient_uid"]
    else:
        patient_uid = next_code("PT", "patients", "patient_uid")
        reg_no = next_code("REG", "patients", "reg_no")
        patient_id = query("""
            INSERT INTO patients (
                patient_uid, reg_no, name, gender, dob, age, blood_group, email, phone,
                alt_phone, aadhar_number, occupation, street, guardian_name,
                guardian_relation, guardian_phone, created_by
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            patient_uid, reg_no, full_name, d.get("gender"), dob, age,
            blank_to_none(d.get("blood_group")), blank_to_none(d.get("email")), d.get("mobile"),
            blank_to_none(d.get("alt_phone")), blank_to_none(d.get("aadhar_number")),
            blank_to_none(d.get("occupation")), blank_to_none(d.get("street_address")),
            blank_to_none(d.get("guardian_name")), blank_to_none(d.get("guardian_relation")),
            blank_to_none(d.get("guardian_mobile")), user_id
        ), fetch=False, commit=True)

    opd_reg_no = next_code("OPD", "op_registrations", "opd_reg_no")
    token_no = next_token_for_today()

    rid = query("""
        INSERT INTO op_registrations (
            patient_id, opd_reg_no, token_no, title, first_name, last_name, gender, dob,
            email, mobile, alt_phone, aadhar_number, visit_type, guardian_relation,
            guardian_name, guardian_mobile, street_address, doctor_id, consultation_fee,
            referral_type, referral_doctor_name, appointment_date, appointment_time,
            payment_mode, registration_fee, abha_number, occupation, blood_group, mlc,
            booking_type, created_by
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        patient_id, opd_reg_no, token_no, blank_to_none(d.get("title")), d.get("first_name"),
        blank_to_none(d.get("last_name")), d.get("gender"), dob,
        blank_to_none(d.get("email")), d.get("mobile"), blank_to_none(d.get("alt_phone")),
        blank_to_none(d.get("aadhar_number")), d.get("visit_type", "General"),
        blank_to_none(d.get("guardian_relation")), blank_to_none(d.get("guardian_name")),
        blank_to_none(d.get("guardian_mobile")), blank_to_none(d.get("street_address")),
        blank_to_none(d.get("doctor_id")), d.get("consultation_fee", 0) or 0,
        d.get("referral_type", "Walkin"), blank_to_none(d.get("referral_doctor_name")),
        blank_to_none(d.get("appointment_date")), blank_to_none(d.get("appointment_time")),
        d.get("payment_mode", "Cash"), d.get("registration_fee", 0) or 0,
        blank_to_none(d.get("abha_number")), blank_to_none(d.get("occupation")),
        blank_to_none(d.get("blood_group")), int(bool(d.get("mlc"))),
        d.get("booking_type", "Walk-in"), user_id
    ), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "OP Registration", rid)
    row = query("""
        SELECT r.*, p.patient_uid AS mr_number, p.reg_no AS patient_reg_no, doc.name AS doctor_name
        FROM op_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        WHERE r.id=%s
    """, (rid,))
    return jsonify(row), 201


@op_reg_bp.route("", methods=["GET"])
@jwt_required()
def list_op_registrations():
    search = request.args.get("search", "")
    like = f"%{search}%"
    rows = query("""
        SELECT r.id, p.patient_uid AS mr_number, p.reg_no AS patient_reg_no, r.opd_reg_no,
               r.token_no, CONCAT(r.first_name,' ',IFNULL(r.last_name,'')) AS name,
               r.mobile, r.gender, TIMESTAMPDIFF(YEAR, r.dob, CURDATE()) AS age,
               doc.name AS doctor_name, r.referral_type, r.appointment_time,
               r.consultation_fee, r.booking_type, r.status, r.created_at
        FROM op_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        WHERE r.first_name LIKE %s OR r.mobile LIKE %s OR p.patient_uid LIKE %s OR r.opd_reg_no LIKE %s
        ORDER BY r.id DESC
    """, (like, like, like, like), many=True)
    return jsonify(rows)