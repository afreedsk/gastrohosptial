from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit

doctors_bp = Blueprint("doctors", __name__)

def blank_to_none(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

# ---------- LIST DOCTORS ----------
@doctors_bp.route("", methods=["GET"])
@jwt_required()
def list_doctors():
    search = request.args.get("search", "")
    like = f"%{search}%"
    rows = query("""
        SELECT d.id, d.name, d.first_name, d.last_name, d.gender, d.phone,
               d.emergency_phone, d.email, d.address, d.department_id, dep.name AS department,
               d.specialization, d.op_consultation_fee, d.ip_consultation_fee,
               d.surgeon_fee, d.emergency_consultation_fee,
               d.op_visits, d.op_valid_for, d.op_doctor_fee, d.ip_doctor_fee,
               d.doctor_description, d.image, d.signature, d.is_active,
               d.max_bookings_per_day
        FROM doctors d
        LEFT JOIN departments dep ON dep.id = d.department_id
        WHERE d.name LIKE %s OR d.email LIKE %s OR d.phone LIKE %s
        ORDER BY d.name
    """, (like, like, like), many=True)
    return jsonify(rows)

# ---------- GET SINGLE DOCTOR ----------
@doctors_bp.route("/<int:doctor_id>", methods=["GET"])
@jwt_required()
def get_doctor(doctor_id):
    row = query("""
        SELECT d.*, dep.name AS department
        FROM doctors d
        LEFT JOIN departments dep ON dep.id = d.department_id
        WHERE d.id=%s
    """, (doctor_id,))
    if not row:
        return jsonify({"error": "Doctor not found"}), 404
    return jsonify(row)

# ---------- CREATE / UPDATE DOCTOR ----------
@doctors_bp.route("", methods=["POST"])
@jwt_required()
def upsert_doctor():
    d = request.get_json() or {}
    doctor_id = d.get("id")
    actor_id = get_jwt_identity()

    first_name = d.get("first_name")
    last_name = blank_to_none(d.get("last_name"))
    gender = blank_to_none(d.get("gender"))
    phone = blank_to_none(d.get("phone"))
    emergency_phone = blank_to_none(d.get("emergency_phone"))
    email = blank_to_none(d.get("email"))
    address = blank_to_none(d.get("address"))
    department_id = blank_to_none(d.get("department_id"))
    specialization = blank_to_none(d.get("specialization"))
    op_consultation_fee = d.get("op_consultation_fee", 0) or 0
    ip_consultation_fee = d.get("ip_consultation_fee", 0) or 0
    surgeon_fee = d.get("surgeon_fee", 0) or 0
    emergency_consultation_fee = d.get("emergency_consultation_fee", 0) or 0
    op_visits = d.get("op_visits", 0) or 0
    op_valid_for = d.get("op_valid_for", 0) or 0
    op_doctor_fee = d.get("op_doctor_fee", 0) or 0
    ip_doctor_fee = d.get("ip_doctor_fee", 0) or 0
    doctor_description = blank_to_none(d.get("doctor_description"))
    image = blank_to_none(d.get("image"))
    signature = blank_to_none(d.get("signature"))
    is_active = 1 if d.get("is_active") else 0
    max_bookings_per_day = d.get("max_bookings_per_day", 0) or 0

    if not first_name:
        return jsonify({"error": "First name is required"}), 400

    full_name = f"Dr. {first_name} {last_name or ''}".strip()

    if doctor_id:
        query("""
            UPDATE doctors
            SET name=%s, first_name=%s, last_name=%s, gender=%s, phone=%s,
                emergency_phone=%s, email=%s, address=%s, department_id=%s,
                specialization=%s, op_consultation_fee=%s, ip_consultation_fee=%s,
                surgeon_fee=%s, emergency_consultation_fee=%s,
                op_visits=%s, op_valid_for=%s, op_doctor_fee=%s, ip_doctor_fee=%s,
                doctor_description=%s, image=%s, signature=%s,
                is_active=%s, max_bookings_per_day=%s
            WHERE id=%s
        """, (full_name, first_name, last_name, gender, phone,
              emergency_phone, email, address, department_id,
              specialization, op_consultation_fee, ip_consultation_fee,
              surgeon_fee, emergency_consultation_fee,
              op_visits, op_valid_for, op_doctor_fee, ip_doctor_fee,
              doctor_description, image, signature,
              is_active, max_bookings_per_day, doctor_id),
        fetch=False, commit=True)
        log_audit(actor_id, "UPDATE_DOCTOR", "Doctor", doctor_id)
        return jsonify({"id": doctor_id, "message": "Doctor updated"}), 200
    else:
        new_id = query("""
            INSERT INTO doctors (
                name, first_name, last_name, gender, phone, emergency_phone,
                email, address, department_id, specialization,
                op_consultation_fee, ip_consultation_fee,
                surgeon_fee, emergency_consultation_fee,
                op_visits, op_valid_for, op_doctor_fee, ip_doctor_fee,
                doctor_description, image, signature,
                is_active, max_bookings_per_day
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (full_name, first_name, last_name, gender, phone, emergency_phone,
              email, address, department_id, specialization,
              op_consultation_fee, ip_consultation_fee,
              surgeon_fee, emergency_consultation_fee,
              op_visits, op_valid_for, op_doctor_fee, ip_doctor_fee,
              doctor_description, image, signature,
              is_active, max_bookings_per_day),
        fetch=False, commit=True)
        log_audit(actor_id, "CREATE_DOCTOR", "Doctor", new_id)
        return jsonify({"id": new_id, "message": "Doctor created"}), 201

# ---------- DELETE DOCTOR ----------
@doctors_bp.route("/<int:doctor_id>", methods=["DELETE"])
@jwt_required()
def delete_doctor(doctor_id):
    row = query("SELECT id FROM doctors WHERE id=%s", (doctor_id,))
    if not row:
        return jsonify({"error": "Doctor not found"}), 404
    query("DELETE FROM doctors WHERE id=%s", (doctor_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DELETE_DOCTOR", "Doctor", doctor_id)
    return jsonify({"success": True}), 200

# ============================================================
# IMPORT DOCTORS FROM CSV (via JSON payload)
# ============================================================
@doctors_bp.route("/import", methods=["POST"])
@jwt_required()
def import_doctors():
    data = request.get_json() or {}
    doctors_list = data.get("doctors", [])
    if not doctors_list:
        return jsonify({"error": "No doctors data provided"}), 400

    actor_id = get_jwt_identity()
    imported = 0
    errors = []

    # Helper to safely convert to float
    def safe_float(val):
        try:
            return float(str(val).strip() or 0)
        except (ValueError, TypeError):
            return 0

    for idx, row in enumerate(doctors_list):
        try:
            name = row.get("Name", "").strip()
            gender = row.get("Gender", "").strip()
            phone = row.get("Phone", "").strip()
            emergency_phone = row.get("Emergency Phone Number", "").strip()
            department_name = row.get("Department", "").strip()
            specialization = row.get("Specialization", "").strip()
            op_fee = safe_float(row.get("OPConsultantFee"))
            ip_fee = safe_float(row.get("IPConsultantFee"))
            email = row.get("Email", "").strip()
            address = row.get("Address", "").strip()
            status = row.get("Status", "Active").strip()

            if not name:
                errors.append(f"Row {idx+1}: Name is required")
                continue

            # Find or create department
            department_id = None
            if department_name:
                dep = query("SELECT id FROM departments WHERE name=%s", (department_name,))
                if not dep:
                    dep_id = query("INSERT INTO departments (name) VALUES (%s)", (department_name,), fetch=False, commit=True)
                    department_id = dep_id
                else:
                    department_id = dep["id"]

            # Check if doctor exists by email or phone
            existing = query("SELECT id FROM doctors WHERE email=%s OR phone=%s", (email, phone))
            if existing:
                # Update
                query("""
                    UPDATE doctors
                    SET name=%s, gender=%s, phone=%s, emergency_phone=%s,
                        department_id=%s, specialization=%s,
                        op_consultation_fee=%s, ip_consultation_fee=%s,
                        address=%s, is_active=%s
                    WHERE id=%s
                """, (name, gender, phone, emergency_phone, department_id,
                      specialization, op_fee, ip_fee, address,
                      1 if status.lower() == "active" else 0, existing["id"]),
                fetch=False, commit=True)
                imported += 1
            else:
                # Split name into first and last
                clean_name = name.replace("Dr.", "").strip()
                parts = clean_name.split()
                first_name = " ".join(parts[:-1]) if len(parts) > 1 else clean_name
                last_name = parts[-1] if len(parts) > 1 else ""

                query("""
                    INSERT INTO doctors (
                        name, first_name, last_name, gender, phone, emergency_phone,
                        department_id, specialization,
                        op_consultation_fee, ip_consultation_fee,
                        email, address, is_active
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (name, first_name, last_name, gender, phone, emergency_phone,
                      department_id, specialization,
                      op_fee, ip_fee,
                      email, address,
                      1 if status.lower() == "active" else 0),
                fetch=False, commit=True)
                imported += 1

        except Exception as e:
            errors.append(f"Row {idx+1}: {str(e)}")

    log_audit(actor_id, "IMPORT_DOCTORS", "Doctor", 0, f"Imported {imported} doctors")
    return jsonify({
        "imported": imported,
        "errors": errors,
        "message": f"Successfully imported {imported} doctors"
    }), 200

# ============================================================
# EXPORT DOCTORS (for CSV download)
# ============================================================
@doctors_bp.route("/export", methods=["GET"])
@jwt_required()
def export_doctors():
    rows = query("""
        SELECT d.name AS Name,
               d.gender AS Gender,
               d.phone AS Phone,
               d.emergency_phone AS `Emergency Phone Number`,
               dep.name AS Department,
               d.specialization AS Specialization,
               d.op_consultation_fee AS OPConsultantFee,
               d.ip_consultation_fee AS IPConsultantFee,
               d.email AS Email,
               d.address AS Address,
               IF(d.is_active=1, 'Active', 'Inactive') AS Status
        FROM doctors d
        LEFT JOIN departments dep ON dep.id = d.department_id
        ORDER BY d.name
    """, many=True)
    return jsonify(rows)