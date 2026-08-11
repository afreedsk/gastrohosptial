from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit, role_required

ip_reg_bp = Blueprint("ip_registrations", __name__)


def blank_to_none(v):
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


@ip_reg_bp.route("", methods=["POST"])
@jwt_required()
def create_ip_registration():
    d = request.get_json()
    if not d.get("first_name") or not d.get("mobile") or not d.get("gender"):
        return jsonify({"error": "first_name, mobile and gender are required"}), 400

    user_id = get_jwt_identity()
    full_name = f"{d.get('title', '')} {d.get('first_name')} {d.get('last_name', '')}".strip()

    dob = blank_to_none(d.get("dob"))
    age = blank_to_none(d.get("age")) or calc_age(dob)

    admitted_date = blank_to_none(d.get("admitted_date")) or date.today().isoformat()

    existing = query("SELECT * FROM patients WHERE phone=%s ORDER BY id DESC LIMIT 1", (d["mobile"],))
    if existing:
        patient_id = existing["id"]
    else:
        patient_uid = next_code("PT", "patients", "patient_uid")
        reg_no = next_code("REG", "patients", "reg_no")
        patient_id = query("""
            INSERT INTO patients (
                patient_uid, reg_no, name, gender, dob, age, blood_group, email, phone,
                alt_phone, aadhar_number, occupation, marital_status, state, city, street,
                pincode, guardian_name, guardian_relation, guardian_phone, created_by
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            patient_uid, reg_no, full_name, d.get("gender"), dob, age,
            blank_to_none(d.get("blood_group")), blank_to_none(d.get("email")), d.get("mobile"),
            blank_to_none(d.get("alt_phone")), blank_to_none(d.get("aadhar_number")),
            blank_to_none(d.get("occupation")), blank_to_none(d.get("marital_status")),
            blank_to_none(d.get("state")), blank_to_none(d.get("city")),
            blank_to_none(d.get("street_address")), blank_to_none(d.get("pincode")),
            blank_to_none(d.get("guardian_name")), blank_to_none(d.get("guardian_relation")),
            blank_to_none(d.get("guardian_mobile")), user_id
        ), fetch=False, commit=True)

    ip_reg_no = next_code("IPR", "ip_registrations", "ip_reg_no")

    rid = query("""
        INSERT INTO ip_registrations (
            patient_id, ip_reg_no, opd_reg_no, title, first_name, last_name, gender, age, dob,
            marital_status, blood_group, aadhar_number, mobile, alt_phone, occupation, email,
            state, city, locality, street_address, pincode, guardian_name, guardian_relation,
            guardian_mobile, mother_name, doctor_id, symptoms, floor, room_type, room_no, bed_no,
            referral_type, payment_mode, advance_amount, booking_type, abha_number,
            admitted_date, created_by
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        patient_id, ip_reg_no, blank_to_none(d.get("opd_reg_no")), blank_to_none(d.get("title")),
        d.get("first_name"), blank_to_none(d.get("last_name")), d.get("gender"), age, dob,
        blank_to_none(d.get("marital_status")), blank_to_none(d.get("blood_group")),
        blank_to_none(d.get("aadhar_number")), d.get("mobile"), blank_to_none(d.get("alt_phone")),
        blank_to_none(d.get("occupation")), blank_to_none(d.get("email")),
        blank_to_none(d.get("state")), blank_to_none(d.get("city")), blank_to_none(d.get("locality")),
        blank_to_none(d.get("street_address")), blank_to_none(d.get("pincode")),
        blank_to_none(d.get("guardian_name")), blank_to_none(d.get("guardian_relation")),
        blank_to_none(d.get("guardian_mobile")), blank_to_none(d.get("mother_name")),
        blank_to_none(d.get("doctor_id")), blank_to_none(d.get("symptoms")),
        blank_to_none(d.get("floor")), d.get("room_type", "General"),
        blank_to_none(d.get("room_no")), blank_to_none(d.get("bed_no")),
        d.get("referral_type", "Walkin"), d.get("payment_mode", "Cash"),
        d.get("advance_amount", 0) or 0, d.get("booking_type", "Walk-in"),
        blank_to_none(d.get("abha_number")), admitted_date, user_id
    ), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "IP Registration", rid)
    row = query("""
        SELECT r.*, p.patient_uid AS mr_number, p.reg_no AS patient_reg_no, doc.name AS doctor_name
        FROM ip_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        WHERE r.id=%s
    """, (rid,))
    return jsonify(row), 201


@ip_reg_bp.route("", methods=["GET"])
@jwt_required()
def list_ip_registrations():
    search = request.args.get("search", "")
    status = request.args.get("status")  # e.g. 'Admitted'
    like = f"%{search}%"

    sql = """
        SELECT r.id, p.patient_uid AS mr_number, p.reg_no AS patient_reg_no, r.opd_reg_no,
               r.ip_reg_no, CONCAT(r.first_name,' ',IFNULL(r.last_name,'')) AS name, r.mobile,
               r.gender, r.age, doc.name AS doctor_name, r.referral_type, r.room_type, r.room_no,
               r.bed_no, r.admitted_date, r.room_transfer_status, r.status, r.created_at
        FROM ip_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        WHERE (r.first_name LIKE %s OR r.mobile LIKE %s OR p.patient_uid LIKE %s OR r.ip_reg_no LIKE %s)
    """
    params = [like, like, like, like]

    if status:
        sql += " AND r.status = %s"
        params.append(status)

    sql += " ORDER BY r.id DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@ip_reg_bp.route("/<int:reg_id>/transfer/request", methods=["POST"])
@jwt_required()
def request_transfer(reg_id):
    d = request.get_json(silent=True) or {}
    room_no = d.get("room_no")
    bed_no = d.get("bed_no")
    if not room_no:
        return jsonify({"error": "room_no is required"}), 400

    row = query("SELECT id FROM ip_registrations WHERE id=%s", (reg_id,))
    if not row:
        return jsonify({"error": "Admission not found"}), 404

    query("""
        UPDATE ip_registrations
        SET requested_room_no=%s, requested_bed_no=%s,
            room_transfer_status='Requested', transfer_requested_at=NOW()
        WHERE id=%s
    """, (room_no, blank_to_none(bed_no), reg_id), fetch=False, commit=True)

    log_audit(get_jwt_identity(), "TRANSFER_REQUEST", "IP Registration", reg_id,
              f"Requested move to {room_no}/{bed_no}")
    return jsonify(query("SELECT * FROM ip_registrations WHERE id=%s", (reg_id,)))


@ip_reg_bp.route("/<int:reg_id>/transfer/approve", methods=["POST"])
@jwt_required()
@role_required("admin", "super_admin")
def approve_transfer(reg_id):
    row = query("SELECT * FROM ip_registrations WHERE id=%s", (reg_id,))
    if not row:
        return jsonify({"error": "Admission not found"}), 404
    if row["room_transfer_status"] != "Requested":
        return jsonify({"error": "No pending transfer request for this admission"}), 400

    query("""
        UPDATE ip_registrations
        SET room_no=requested_room_no, bed_no=requested_bed_no,
            requested_room_no=NULL, requested_bed_no=NULL,
            room_transfer_status='Transferred'
        WHERE id=%s
    """, (reg_id,), fetch=False, commit=True)

    log_audit(get_jwt_identity(), "TRANSFER_APPROVE", "IP Registration", reg_id, "Transfer approved")
    return jsonify(query("SELECT * FROM ip_registrations WHERE id=%s", (reg_id,)))


@ip_reg_bp.route("/<int:reg_id>/transfer/reject", methods=["POST"])
@jwt_required()
@role_required("admin", "super_admin")
def reject_transfer(reg_id):
    row = query("SELECT id, room_transfer_status FROM ip_registrations WHERE id=%s", (reg_id,))
    if not row:
        return jsonify({"error": "Admission not found"}), 404
    if row["room_transfer_status"] != "Requested":
        return jsonify({"error": "No pending transfer request for this admission"}), 400

    query("""
        UPDATE ip_registrations
        SET requested_room_no=NULL, requested_bed_no=NULL, room_transfer_status='None'
        WHERE id=%s
    """, (reg_id,), fetch=False, commit=True)

    log_audit(get_jwt_identity(), "TRANSFER_REJECT", "IP Registration", reg_id, "Transfer rejected")
    return jsonify(query("SELECT * FROM ip_registrations WHERE id=%s", (reg_id,)))


@ip_reg_bp.route("/transfer-requests", methods=["GET"])
@jwt_required()
def list_transfer_requests():
    rows = query("""
        SELECT r.id, p.patient_uid AS mr_number, p.reg_no AS patient_reg_no,
               CONCAT(r.first_name,' ',IFNULL(r.last_name,'')) AS name,
               r.room_type AS from_room_type, r.room_no AS from_room_no, r.bed_no AS from_bed_no,
               r.requested_room_no AS to_room_no, r.requested_bed_no AS to_bed_no,
               r.transfer_requested_at
        FROM ip_registrations r
        JOIN patients p ON p.id = r.patient_id
        WHERE r.room_transfer_status = 'Requested'
        ORDER BY r.transfer_requested_at DESC
    """, many=True)
    return jsonify(rows)