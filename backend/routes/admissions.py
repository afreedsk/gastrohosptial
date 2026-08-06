from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

admissions_bp = Blueprint("admissions", __name__)


@admissions_bp.route("", methods=["POST"])
@jwt_required()
def admit_patient():
    d = request.get_json()
    required = ["patient_id", "ward_id", "room_id", "bed_id", "admission_date"]
    if not all(d.get(f) for f in required):
        return jsonify({"error": "patient_id, ward_id, room_id, bed_id, admission_date are required"}), 400

    bed = query("SELECT status FROM beds WHERE id=%s", (d["bed_id"],))
    if not bed or bed["status"] != "Available":
        return jsonify({"error": "Selected bed is not available"}), 409

    admission_no = next_code("ADM", "admissions", "admission_no")
    user_id = get_jwt_identity()

    aid = query("""
        INSERT INTO admissions (admission_no, patient_id, doctor_id, ward_id, room_id, bed_id,
            admission_date, admission_time, reason, diagnosis, advance_amount, status, created_by)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'Admitted',%s)
    """, (admission_no, d["patient_id"], d.get("doctor_id"), d["ward_id"], d["room_id"], d["bed_id"],
          d["admission_date"], d.get("admission_time"), d.get("reason"), d.get("diagnosis"),
          d.get("advance_amount", 0), user_id), fetch=False, commit=True)

    query("UPDATE beds SET status='Occupied' WHERE id=%s", (d["bed_id"],), fetch=False, commit=True)
    log_audit(user_id, "ADMIT", "Admission", aid)

    return jsonify(query("""
        SELECT a.*, p.name AS patient_name, w.name AS ward_name, r.room_no, b.bed_no
        FROM admissions a
        JOIN patients p ON p.id=a.patient_id
        LEFT JOIN wards w ON w.id=a.ward_id
        LEFT JOIN rooms r ON r.id=a.room_id
        LEFT JOIN beds b ON b.id=a.bed_id
        WHERE a.id=%s
    """, (aid,))), 201


@admissions_bp.route("", methods=["GET"])
@jwt_required()
def list_admissions():
    status = request.args.get("status")
    sql = """
        SELECT a.*, p.name AS patient_name, w.name AS ward_name, r.room_no, b.bed_no
        FROM admissions a
        JOIN patients p ON p.id=a.patient_id
        LEFT JOIN wards w ON w.id=a.ward_id
        LEFT JOIN rooms r ON r.id=a.room_id
        LEFT JOIN beds b ON b.id=a.bed_id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND a.status=%s"
        params.append(status)
    sql += " ORDER BY a.id DESC"
    return jsonify(query(sql, tuple(params), many=True))


@admissions_bp.route("/<int:aid>/transfer", methods=["POST"])
@jwt_required()
def transfer_room(aid):
    d = request.get_json()
    if not d.get("to_room_id") or not d.get("to_bed_id"):
        return jsonify({"error": "to_room_id and to_bed_id are required"}), 400

    admission = query("SELECT * FROM admissions WHERE id=%s", (aid,))
    if not admission:
        return jsonify({"error": "Admission not found"}), 404

    bed = query("SELECT status FROM beds WHERE id=%s", (d["to_bed_id"],))
    if not bed or bed["status"] != "Available":
        return jsonify({"error": "Target bed is not available"}), 409

    query("""INSERT INTO room_transfers (admission_id, from_room_id, to_room_id, from_bed_id, to_bed_id, reason)
              VALUES (%s,%s,%s,%s,%s,%s)""",
          (aid, admission["room_id"], d["to_room_id"], admission["bed_id"], d["to_bed_id"], d.get("reason")),
          fetch=False, commit=True)

    query("UPDATE beds SET status='Available' WHERE id=%s", (admission["bed_id"],), fetch=False, commit=True)
    query("UPDATE beds SET status='Occupied' WHERE id=%s", (d["to_bed_id"],), fetch=False, commit=True)
    query("UPDATE admissions SET room_id=%s, bed_id=%s WHERE id=%s",
          (d["to_room_id"], d["to_bed_id"], aid), fetch=False, commit=True)

    log_audit(get_jwt_identity(), "TRANSFER", "Admission", aid, d.get("reason"))
    return jsonify(query("SELECT * FROM admissions WHERE id=%s", (aid,)))


@admissions_bp.route("/<int:aid>/discharge", methods=["POST"])
@jwt_required()
def discharge(aid):
    admission = query("SELECT * FROM admissions WHERE id=%s", (aid,))
    if not admission:
        return jsonify({"error": "Admission not found"}), 404

    query("UPDATE admissions SET status='Discharged', discharge_date=NOW() WHERE id=%s", (aid,), fetch=False, commit=True)
    if admission["bed_id"]:
        query("UPDATE beds SET status='Available' WHERE id=%s", (admission["bed_id"],), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DISCHARGE", "Admission", aid)
    return jsonify(query("SELECT * FROM admissions WHERE id=%s", (aid,)))


@admissions_bp.route("/<int:aid>/cancel", methods=["POST"])
@jwt_required()
def cancel_admission(aid):
    d = request.get_json() or {}
    admission = query("SELECT * FROM admissions WHERE id=%s", (aid,))
    if not admission:
        return jsonify({"error": "Admission not found"}), 404
    query("UPDATE admissions SET status='Cancelled' WHERE id=%s", (aid,), fetch=False, commit=True)
    if admission["bed_id"]:
        query("UPDATE beds SET status='Available' WHERE id=%s", (admission["bed_id"],), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "CANCEL", "Admission", aid, d.get("reason"))
    return jsonify(query("SELECT * FROM admissions WHERE id=%s", (aid,)))


@admissions_bp.route("/wards", methods=["GET"])
@jwt_required()
def wards():
    return jsonify(query("SELECT * FROM wards", many=True))


@admissions_bp.route("/rooms", methods=["GET"])
@jwt_required()
def rooms():
    ward_id = request.args.get("ward_id")
    if ward_id:
        return jsonify(query("SELECT * FROM rooms WHERE ward_id=%s", (ward_id,), many=True))
    return jsonify(query("SELECT * FROM rooms", many=True))


@admissions_bp.route("/beds", methods=["GET"])
@jwt_required()
def beds():
    room_id = request.args.get("room_id")
    status = request.args.get("status", "Available")
    sql = "SELECT * FROM beds WHERE status=%s"
    params = [status]
    if room_id:
        sql += " AND room_id=%s"
        params.append(room_id)
    return jsonify(query(sql, tuple(params), many=True))
