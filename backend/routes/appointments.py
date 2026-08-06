from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

appointments_bp = Blueprint("appointments", __name__)


@appointments_bp.route("", methods=["POST"])
@jwt_required()
def book_appointment():
    d = request.get_json()
    required = ["patient_id", "department_id", "doctor_id", "appointment_date"]
    if not all(d.get(f) for f in required):
        return jsonify({"error": "patient_id, department_id, doctor_id, appointment_date are required"}), 400

    appointment_no = next_code("APT", "appointments", "appointment_no")

    # token number = count of bookings for that doctor/date + 1
    row = query("""SELECT COUNT(*) AS c FROM appointments
                    WHERE doctor_id=%s AND appointment_date=%s AND status != 'Cancelled'""",
                (d["doctor_id"], d["appointment_date"]))
    token_no = (row["c"] if row else 0) + 1

    doctor = query("SELECT consultation_fee FROM doctors WHERE id=%s", (d["doctor_id"],))
    fee = d.get("consultation_fee") or (doctor["consultation_fee"] if doctor else 0)

    user_id = get_jwt_identity()
    aid = query("""
        INSERT INTO appointments
        (appointment_no, patient_id, department_id, doctor_id, appointment_date,
         time_slot, token_no, consultation_fee, visit_type, status, created_by)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'Booked',%s)
    """, (appointment_no, d["patient_id"], d["department_id"], d["doctor_id"],
          d["appointment_date"], d.get("time_slot"), token_no, fee,
          d.get("visit_type", "New"), user_id), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "Appointment", aid)
    return jsonify(query("""
        SELECT a.*, p.name AS patient_name, doc.name AS doctor_name, dep.name AS department_name
        FROM appointments a
        JOIN patients p ON p.id=a.patient_id
        LEFT JOIN doctors doc ON doc.id=a.doctor_id
        LEFT JOIN departments dep ON dep.id=a.department_id
        WHERE a.id=%s
    """, (aid,))), 201


@appointments_bp.route("", methods=["GET"])
@jwt_required()
def list_appointments():
    date_filter = request.args.get("date")
    status = request.args.get("status")
    sql = """
        SELECT a.*, p.name AS patient_name, p.phone AS patient_phone,
               doc.name AS doctor_name, dep.name AS department_name
        FROM appointments a
        JOIN patients p ON p.id=a.patient_id
        LEFT JOIN doctors doc ON doc.id=a.doctor_id
        LEFT JOIN departments dep ON dep.id=a.department_id
        WHERE 1=1
    """
    params = []
    if date_filter:
        sql += " AND a.appointment_date=%s"
        params.append(date_filter)
    if status:
        sql += " AND a.status=%s"
        params.append(status)
    sql += " ORDER BY a.id DESC"
    return jsonify(query(sql, tuple(params), many=True))


@appointments_bp.route("/<int:aid>/status", methods=["PATCH"])
@jwt_required()
def update_status(aid):
    d = request.get_json()
    status = d.get("status")
    if status not in ["Booked", "Completed", "Cancelled", "Rescheduled"]:
        return jsonify({"error": "invalid status"}), 400
    updates = ["status=%s"]
    params = [status]
    if status == "Rescheduled":
        if d.get("appointment_date"):
            updates.append("appointment_date=%s")
            params.append(d["appointment_date"])
        if d.get("time_slot"):
            updates.append("time_slot=%s")
            params.append(d["time_slot"])
    params.append(aid)
    query(f"UPDATE appointments SET {', '.join(updates)} WHERE id=%s", tuple(params), fetch=False, commit=True)
    log_audit(get_jwt_identity(), status, "Appointment", aid, d.get("reason"))
    return jsonify(query("SELECT * FROM appointments WHERE id=%s", (aid,)))


@appointments_bp.route("/departments", methods=["GET"])
@jwt_required()
def departments():
    return jsonify(query("SELECT * FROM departments", many=True))


@appointments_bp.route("/doctors", methods=["GET"])
@jwt_required()
def doctors():
    dept_id = request.args.get("department_id")
    if dept_id:
        return jsonify(query("SELECT * FROM doctors WHERE department_id=%s", (dept_id,), many=True))
    return jsonify(query("SELECT * FROM doctors", many=True))
