from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

patients_bp = Blueprint("patients", __name__)


def calc_age(dob_str):
    if not dob_str:
        return None
    y, m, d = map(int, dob_str.split("-"))
    today = date.today()
    return today.year - y - ((today.month, today.day) < (m, d))


@patients_bp.route("", methods=["POST"])
@jwt_required()
def create_patient():
    d = request.get_json()
    if not d.get("name") or not d.get("phone") or not d.get("gender"):
        return jsonify({"error": "name, phone and gender are required"}), 400

    patient_uid = next_code("PT", "patients", "patient_uid")
    reg_no = next_code("REG", "patients", "reg_no")
    age = calc_age(d.get("dob"))
    user_id = get_jwt_identity()

    pid = query("""
        INSERT INTO patients (
            patient_uid, reg_no, name, gender, dob, age, blood_group, weight, height,
            email, phone, alt_phone, aadhar_number, occupation, marital_status,
            door_no, street, city, district, state, pincode,
            guardian_name, guardian_relation, guardian_phone,
            allergies, diabetes, hypertension, existing_diseases, notes, created_by
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        patient_uid, reg_no, d.get("name"), d.get("gender"), d.get("dob"), age,
        d.get("blood_group"), d.get("weight"), d.get("height"),
        d.get("email"), d.get("phone"), d.get("alt_phone"), d.get("aadhar_number"),
        d.get("occupation"), d.get("marital_status"),
        d.get("door_no"), d.get("street"), d.get("city"), d.get("district"),
        d.get("state"), d.get("pincode"),
        d.get("guardian_name"), d.get("guardian_relation"), d.get("guardian_phone"),
        d.get("allergies"), int(bool(d.get("diabetes"))), int(bool(d.get("hypertension"))),
        d.get("existing_diseases"), d.get("notes"), user_id
    ), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "Patient Registration", pid)
    patient = query("SELECT * FROM patients WHERE id=%s", (pid,))
    return jsonify(patient), 201


@patients_bp.route("", methods=["GET"])
@jwt_required()
def list_patients():
    search = request.args.get("search", "")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    like = f"%{search}%"
    rows = query("""
        SELECT * FROM patients
        WHERE name LIKE %s OR phone LIKE %s OR patient_uid LIKE %s OR reg_no LIKE %s
           OR email LIKE %s
        ORDER BY id DESC LIMIT %s OFFSET %s
    """, (like, like, like, like, like, limit, offset), many=True)
    return jsonify(rows)


@patients_bp.route("/<int:patient_id>/status", methods=["PATCH"])
@jwt_required()
def update_patient_status(patient_id):
    d = request.get_json(silent=True) or {}
    is_active = d.get("is_active")
    if is_active is None:
        return jsonify({"error": "is_active is required"}), 400

    row = query("SELECT id FROM patients WHERE id=%s", (patient_id,))
    if not row:
        return jsonify({"error": "Patient not found"}), 404

    query("UPDATE patients SET is_active=%s WHERE id=%s", (1 if is_active else 0, patient_id),
          fetch=False, commit=True)
    log_audit(get_jwt_identity(), "STATUS_CHANGE", "Patient", patient_id,
              f"{'Activated' if is_active else 'Deactivated'}")
    return jsonify(query("SELECT * FROM patients WHERE id=%s", (patient_id,)))


@patients_bp.route("/<int:patient_id>", methods=["GET"])
@jwt_required()
def get_patient(patient_id):
    p = query("SELECT * FROM patients WHERE id=%s", (patient_id,))
    if not p:
        return jsonify({"error": "Patient not found"}), 404
    return jsonify(p)


@patients_bp.route("/<int:patient_id>", methods=["PUT"])
@jwt_required()
def update_patient(patient_id):
    d = request.get_json()
    fields = [
        "name","gender","dob","blood_group","weight","height","email","phone","alt_phone",
        "aadhar_number","occupation","marital_status","door_no","street","city","district",
        "state","pincode","guardian_name","guardian_relation","guardian_phone",
        "allergies","diabetes","hypertension","existing_diseases","notes"
    ]
    updates, params = [], []
    for f in fields:
        if f in d:
            updates.append(f"{f}=%s")
            params.append(d[f])
    if "dob" in d:
        updates.append("age=%s")
        params.append(calc_age(d.get("dob")))
    if not updates:
        return jsonify({"error": "No fields to update"}), 400
    params.append(patient_id)
    query(f"UPDATE patients SET {', '.join(updates)} WHERE id=%s", tuple(params), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "UPDATE", "Patient Registration", patient_id)
    return jsonify(query("SELECT * FROM patients WHERE id=%s", (patient_id,)))