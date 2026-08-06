from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import query

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    registrations = query("SELECT COUNT(*) c FROM patients WHERE DATE(created_at)=CURDATE()")["c"]
    appointments = query("SELECT COUNT(*) c FROM appointments WHERE appointment_date=CURDATE()")["c"]
    op_patients = query("""SELECT COUNT(DISTINCT patient_id) c FROM op_bills WHERE DATE(created_at)=CURDATE()""")["c"]
    ip_admissions = query("SELECT COUNT(*) c FROM admissions WHERE admission_date=CURDATE()")["c"]
    pending_bills = query("SELECT COUNT(*) c FROM op_bills WHERE status IN ('Due','Partial')")["c"] + \
        query("SELECT COUNT(*) c FROM ip_bills WHERE status IN ('Due','Partial','Draft')")["c"]
    revenue = (query("SELECT IFNULL(SUM(paid_amount),0) s FROM op_bills WHERE DATE(created_at)=CURDATE()")["s"] or 0) + \
        (query("SELECT IFNULL(SUM(paid_amount),0) s FROM ip_bills WHERE DATE(created_at)=CURDATE()")["s"] or 0)
    cancelled_bills = query("SELECT COUNT(*) c FROM op_bills WHERE status='Cancelled' AND DATE(created_at)=CURDATE()")["c"] + \
        query("SELECT COUNT(*) c FROM ip_bills WHERE status='Cancelled' AND DATE(created_at)=CURDATE()")["c"]
    pending_labs = query("SELECT COUNT(*) c FROM lab_tests WHERE status='Pending'")["c"]

    return jsonify({
        "todays_registrations": registrations,
        "todays_appointments": appointments,
        "todays_op_patients": op_patients,
        "todays_ip_admissions": ip_admissions,
        "pending_bills": pending_bills,
        "todays_revenue": float(revenue),
        "cancelled_bills": cancelled_bills,
        "pending_lab_reports": pending_labs,
    })


@dashboard_bp.route("/charts/patients-per-day", methods=["GET"])
@jwt_required()
def patients_per_day():
    rows = query("""
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM patients
        WHERE created_at >= CURDATE() - INTERVAL 6 DAY
        GROUP BY DATE(created_at) ORDER BY day
    """, many=True)
    return jsonify(rows)


@dashboard_bp.route("/charts/revenue", methods=["GET"])
@jwt_required()
def revenue_chart():
    rows = query("""
        SELECT d.day, IFNULL(op.total,0) + IFNULL(ip.total,0) AS revenue FROM (
            SELECT CURDATE() - INTERVAL n DAY AS day
            FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
                  UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) days
        ) d
        LEFT JOIN (SELECT DATE(created_at) day, SUM(paid_amount) total FROM op_bills GROUP BY DATE(created_at)) op
            ON op.day = d.day
        LEFT JOIN (SELECT DATE(created_at) day, SUM(paid_amount) total FROM ip_bills GROUP BY DATE(created_at)) ip
            ON ip.day = d.day
        ORDER BY d.day
    """, many=True)
    return jsonify(rows)


@dashboard_bp.route("/charts/op-vs-ip", methods=["GET"])
@jwt_required()
def op_vs_ip():
    op = query("SELECT COUNT(*) c FROM op_bills WHERE DATE(created_at) >= CURDATE() - INTERVAL 6 DAY")["c"]
    ip = query("SELECT COUNT(*) c FROM ip_bills WHERE DATE(created_at) >= CURDATE() - INTERVAL 6 DAY")["c"]
    return jsonify([{"name": "OP", "value": op}, {"name": "IP", "value": ip}])


@dashboard_bp.route("/charts/department-collection", methods=["GET"])
@jwt_required()
def department_collection():
    rows = query("""
        SELECT dep.name AS department, IFNULL(SUM(a.consultation_fee),0) AS collection
        FROM departments dep
        LEFT JOIN appointments a ON a.department_id = dep.id AND a.status='Completed'
        GROUP BY dep.id
    """, many=True)
    return jsonify(rows)
