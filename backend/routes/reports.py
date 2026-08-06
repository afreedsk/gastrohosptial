from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/patients/daily", methods=["GET"])
@jwt_required()
def daily_registrations():
    d = request.args.get("date")
    sql = "SELECT * FROM patients WHERE 1=1"
    params = []
    if d:
        sql += " AND DATE(created_at)=%s"
        params.append(d)
    else:
        sql += " AND DATE(created_at)=CURDATE()"
    return jsonify(query(sql, tuple(params), many=True))


@reports_bp.route("/patients/monthly", methods=["GET"])
@jwt_required()
def monthly_registrations():
    month = request.args.get("month")  # format YYYY-MM
    sql = "SELECT * FROM patients WHERE DATE_FORMAT(created_at, '%%Y-%%m')=%s"
    params = [month] if month else []
    if not month:
        sql = "SELECT * FROM patients WHERE DATE_FORMAT(created_at, '%%Y-%%m')=DATE_FORMAT(CURDATE(), '%%Y-%%m')"
    return jsonify(query(sql, tuple(params), many=True))


@reports_bp.route("/patients/history/<int:patient_id>", methods=["GET"])
@jwt_required()
def patient_history(patient_id):
    return jsonify({
        "appointments": query("SELECT * FROM appointments WHERE patient_id=%s ORDER BY id DESC", (patient_id,), many=True),
        "admissions": query("SELECT * FROM admissions WHERE patient_id=%s ORDER BY id DESC", (patient_id,), many=True),
        "op_bills": query("SELECT * FROM op_bills WHERE patient_id=%s ORDER BY id DESC", (patient_id,), many=True),
    })


@reports_bp.route("/patients/doctor-wise", methods=["GET"])
@jwt_required()
def doctor_wise_patients():
    return jsonify(query("""
        SELECT doc.name AS doctor, COUNT(a.id) AS patient_count
        FROM doctors doc LEFT JOIN appointments a ON a.doctor_id=doc.id
        GROUP BY doc.id
    """, many=True))


@reports_bp.route("/billing/daily-collection", methods=["GET"])
@jwt_required()
def daily_collection():
    d = request.args.get("date")
    date_clause = "DATE(created_at)=%s" if d else "DATE(created_at)=CURDATE()"
    params = (d,) if d else ()
    op = query(f"SELECT IFNULL(SUM(paid_amount),0) s FROM op_bills WHERE {date_clause}", params)["s"]
    ip = query(f"SELECT IFNULL(SUM(paid_amount),0) s FROM ip_bills WHERE {date_clause}", params)["s"]
    return jsonify({"op_collection": float(op), "ip_collection": float(ip), "total": float(op) + float(ip)})


@reports_bp.route("/billing/monthly-collection", methods=["GET"])
@jwt_required()
def monthly_collection():
    month = request.args.get("month")
    clause = "DATE_FORMAT(created_at,'%%Y-%%m')=%s" if month else "DATE_FORMAT(created_at,'%%Y-%%m')=DATE_FORMAT(CURDATE(),'%%Y-%%m')"
    params = (month,) if month else ()
    op = query(f"SELECT IFNULL(SUM(paid_amount),0) s FROM op_bills WHERE {clause}", params)["s"]
    ip = query(f"SELECT IFNULL(SUM(paid_amount),0) s FROM ip_bills WHERE {clause}", params)["s"]
    return jsonify({"op_collection": float(op), "ip_collection": float(ip), "total": float(op) + float(ip)})


@reports_bp.route("/billing/outstanding", methods=["GET"])
@jwt_required()
def outstanding():
    op = query("SELECT * FROM op_bills WHERE due_amount > 0 ORDER BY id DESC", many=True)
    ip = query("SELECT * FROM ip_bills WHERE due_amount > 0 ORDER BY id DESC", many=True)
    return jsonify({"op": op, "ip": ip})


@reports_bp.route("/billing/cancelled", methods=["GET"])
@jwt_required()
def cancelled_bills():
    op = query("SELECT * FROM op_bills WHERE status='Cancelled' ORDER BY id DESC", many=True)
    ip = query("SELECT * FROM ip_bills WHERE status='Cancelled' ORDER BY id DESC", many=True)
    return jsonify({"op": op, "ip": ip})


@reports_bp.route("/billing/refunds", methods=["GET"])
@jwt_required()
def refunds():
    return jsonify(query("SELECT * FROM billing_actions WHERE action_type='Advance_Refund' ORDER BY id DESC", many=True))


@reports_bp.route("/lab/pending", methods=["GET"])
@jwt_required()
def lab_pending():
    return jsonify(query("SELECT * FROM lab_tests WHERE status='Pending' ORDER BY id DESC", many=True))


@reports_bp.route("/lab/completed", methods=["GET"])
@jwt_required()
def lab_completed():
    return jsonify(query("SELECT * FROM lab_tests WHERE status='Completed' ORDER BY id DESC", many=True))


@reports_bp.route("/lab/cancelled", methods=["GET"])
@jwt_required()
def lab_cancelled():
    return jsonify(query("SELECT * FROM lab_tests WHERE status='Cancelled' ORDER BY id DESC", many=True))


@reports_bp.route("/admissions/current", methods=["GET"])
@jwt_required()
def current_ip():
    return jsonify(query("""SELECT a.*, p.name AS patient_name FROM admissions a
                             JOIN patients p ON p.id=a.patient_id
                             WHERE a.status='Admitted' ORDER BY a.id DESC""", many=True))


@reports_bp.route("/admissions/discharged", methods=["GET"])
@jwt_required()
def discharged():
    return jsonify(query("""SELECT a.*, p.name AS patient_name FROM admissions a
                             JOIN patients p ON p.id=a.patient_id
                             WHERE a.status='Discharged' ORDER BY a.id DESC""", many=True))


@reports_bp.route("/admissions/transfers", methods=["GET"])
@jwt_required()
def transfers():
    return jsonify(query("SELECT * FROM room_transfers ORDER BY id DESC", many=True))


@reports_bp.route("/admissions/occupancy", methods=["GET"])
@jwt_required()
def occupancy():
    total = query("SELECT COUNT(*) c FROM beds")["c"]
    occupied = query("SELECT COUNT(*) c FROM beds WHERE status='Occupied'")["c"]
    rate = round((occupied / total) * 100, 2) if total else 0
    return jsonify({"total_beds": total, "occupied": occupied, "occupancy_rate": rate})
