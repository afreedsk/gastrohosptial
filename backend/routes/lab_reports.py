from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

lab_reports_bp = Blueprint("lab_reports", __name__)

# ---------- OP LAB REPORTS ----------
@lab_reports_bp.route("/op", methods=["GET"])
@jwt_required()
def get_op_lab_reports():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    patient_id = request.args.get("patient_id")
    status = request.args.get("status")

    sql = """
        SELECT lr.id, lr.op_registration_id, lr.patient_id, 
               lr.test_name, lr.result, lr.normal_range, lr.unit,
               lr.status, lr.report_date, lr.created_at, lr.updated_at,
               p.name AS patient_name, p.patient_uid AS mr_number,
               r.opd_reg_no,
               u1.name AS performed_by_name,
               u2.name AS verified_by_name
        FROM op_lab_results lr
        JOIN patients p ON p.id = lr.patient_id
        JOIN op_registrations r ON r.id = lr.op_registration_id
        LEFT JOIN users u1 ON u1.id = lr.performed_by
        LEFT JOIN users u2 ON u2.id = lr.verified_by
        WHERE 1=1
    """
    params = []

    if patient_id:
        sql += " AND lr.patient_id = %s"
        params.append(patient_id)
    
    if search:
        sql += " AND (lr.test_name LIKE %s OR p.name LIKE %s OR r.opd_reg_no LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like])
    
    if start_date:
        sql += " AND DATE(lr.report_date) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(lr.report_date) <= %s"
        params.append(end_date)
    if status:
        sql += " AND lr.status = %s"
        params.append(status)

    sql += " ORDER BY lr.created_at DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

# ---------- IP LAB REPORTS ----------
@lab_reports_bp.route("/ip", methods=["GET"])
@jwt_required()
def get_ip_lab_reports():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    patient_id = request.args.get("patient_id")
    status = request.args.get("status")

    sql = """
        SELECT lr.id, lr.ip_registration_id, lr.patient_id, 
               lr.test_name, lr.result, lr.normal_range, lr.unit,
               lr.status, lr.report_date, lr.created_at, lr.updated_at,
               p.name AS patient_name, p.patient_uid AS mr_number,
               r.ip_reg_no,
               u1.name AS performed_by_name,
               u2.name AS verified_by_name
        FROM ip_lab_results lr
        JOIN patients p ON p.id = lr.patient_id
        JOIN ip_registrations r ON r.id = lr.ip_registration_id
        LEFT JOIN users u1 ON u1.id = lr.performed_by
        LEFT JOIN users u2 ON u2.id = lr.verified_by
        WHERE 1=1
    """
    params = []

    if patient_id:
        sql += " AND lr.patient_id = %s"
        params.append(patient_id)
    
    if search:
        sql += " AND (lr.test_name LIKE %s OR p.name LIKE %s OR r.ip_reg_no LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like])
    
    if start_date:
        sql += " AND DATE(lr.report_date) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(lr.report_date) <= %s"
        params.append(end_date)
    if status:
        sql += " AND lr.status = %s"
        params.append(status)

    sql += " ORDER BY lr.created_at DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

# ---------- UPDATE REPORT STATUS ----------
@lab_reports_bp.route("/<int:report_id>/status", methods=["PATCH"])
@jwt_required()
def update_report_status(report_id):
    data = request.get_json() or {}
    status = data.get("status")
    table = data.get("table")  # 'op' or 'ip'
    
    if not status or not table:
        return jsonify({"error": "status and table are required"}), 400
    
    if table not in ['op', 'ip']:
        return jsonify({"error": "Invalid table"}), 400
    
    table_name = "op_lab_results" if table == "op" else "ip_lab_results"
    
    row = query(f"SELECT id FROM {table_name} WHERE id=%s", (report_id,))
    if not row:
        return jsonify({"error": "Report not found"}), 404
    
    query(f"UPDATE {table_name} SET status=%s WHERE id=%s", (status, report_id), fetch=False, commit=True)
    return jsonify({"success": True}), 200