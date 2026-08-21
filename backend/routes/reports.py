from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

reports_bp = Blueprint("reports", __name__)


def _date_range_args():
    start = request.args.get("start_date")
    end = request.args.get("end_date")
    show_discharged = request.args.get("show_discharged") == "1"
    return start, end, show_discharged


@reports_bp.route("/ip-lab", methods=["GET"])
@jwt_required()
def ip_lab_report():
    start, end, show_discharged = _date_range_args()
    if not start or not end:
        return jsonify({"error": "start_date and end_date are required"}), 400

    sql = """
        SELECT r.id, p.patient_uid AS mr_number, r.ip_reg_no AS patient_reg_no, r.patient_id,
               CONCAT(r.first_name, ' ', IFNULL(r.last_name, '')) AS name,
               r.mobile AS contact, r.age, r.gender, doc.name AS doctor_name,
               r.room_type, r.room_no, r.bed_no
        FROM ip_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        WHERE r.admitted_date BETWEEN %s AND %s
    """
    params = [start, end]
    if not show_discharged:
        sql += " AND r.status != 'Discharged'"
    sql += " ORDER BY r.admitted_date DESC, r.id DESC"

    rows = query(sql, tuple(params), many=True)
    _attach_lab_orders(rows, "ip_registration_id")
    return jsonify(rows)


@reports_bp.route("/op-lab", methods=["GET"])
@jwt_required()
def op_lab_report():
    start, end, _ = _date_range_args()
    if not start or not end:
        return jsonify({"error": "start_date and end_date are required"}), 400

    sql = """
        SELECT r.id, p.patient_uid AS mr_number, r.opd_reg_no AS patient_reg_no, r.patient_id,
               CONCAT(r.first_name, ' ', IFNULL(r.last_name, '')) AS name,
               r.mobile AS contact, TIMESTAMPDIFF(YEAR, r.dob, CURDATE()) AS age, r.gender,
               doc.name AS doctor_name,
               CONCAT(r.appointment_date, ' ', IFNULL(r.appointment_time, '')) AS appointment_at
        FROM op_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        WHERE r.appointment_date BETWEEN %s AND %s
        ORDER BY r.appointment_date DESC, r.id DESC
    """
    rows = query(sql, (start, end), many=True)
    _attach_lab_orders(rows, "op_registration_id")
    return jsonify(rows)


@reports_bp.route("/ip-radiology", methods=["GET"])
@jwt_required()
def ip_radiology_report():
    start, end, show_discharged = _date_range_args()
    if not start or not end:
        return jsonify({"error": "start_date and end_date are required"}), 400

    sql = """
        SELECT DISTINCT r.id, p.patient_uid AS mr_number, r.ip_reg_no AS patient_reg_no, r.patient_id,
               CONCAT(r.first_name, ' ', IFNULL(r.last_name, '')) AS name,
               r.mobile AS contact, r.gender, r.age, doc.name AS doctor_name,
               r.room_type, r.room_no, r.bed_no
        FROM ip_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        JOIN radiology_orders ro ON ro.ip_registration_id = r.id
        WHERE r.admitted_date BETWEEN %s AND %s
    """
    params = [start, end]
    if not show_discharged:
        sql += " AND r.status != 'Discharged'"
    sql += " ORDER BY r.admitted_date DESC, r.id DESC"

    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)


@reports_bp.route("/op-radiology", methods=["GET"])
@jwt_required()
def op_radiology_report():
    start, end, _ = _date_range_args()
    if not start or not end:
        return jsonify({"error": "start_date and end_date are required"}), 400

    sql = """
        SELECT DISTINCT r.id, p.patient_uid AS mr_number, r.opd_reg_no AS patient_reg_no, r.patient_id,
               CONCAT(r.first_name, ' ', IFNULL(r.last_name, '')) AS name,
               r.mobile AS contact, r.gender, TIMESTAMPDIFF(YEAR, r.dob, CURDATE()) AS age,
               doc.name AS doctor_name,
               CONCAT(r.appointment_date, ' ', IFNULL(r.appointment_time, '')) AS appointment_at
        FROM op_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        JOIN radiology_orders ro ON ro.op_registration_id = r.id
        WHERE r.appointment_date BETWEEN %s AND %s
        ORDER BY r.appointment_date DESC, r.id DESC
    """
    rows = query(sql, (start, end), many=True)
    return jsonify(rows)


def _attach_lab_orders(rows, registration_fk):
    """Mutates `rows` in place, adding a `lab_orders: [{order_no}, ...]` list
    to each row — one entry per test in lab_orders for that registration,
    matching the frontend's expected shape (order numbers repeat per test,
    same as the legacy report)."""
    for row in rows:
        orders = query(
            f"""
                SELECT order_no FROM lab_orders
                WHERE {registration_fk} = %s
                ORDER BY ordered_at, id
            """,
            (row["id"],),
            many=True,
        )
        row["lab_orders"] = orders