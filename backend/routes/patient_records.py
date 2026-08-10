from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

patient_records_bp = Blueprint("patient_records", __name__)


@patient_records_bp.route("", methods=["GET"])
@jwt_required()
def search_records():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    rec_type = request.args.get("type", "ALL")  # OP, IP, ALL
    search = request.args.get("search", "")
    like = f"%{search}%"

    results = []

    if rec_type in ("OP", "ALL"):
        params = [like, like]
        sql = """
            SELECT 'OP' AS type, p.name AS patient_name, r.gender,
                   TIMESTAMPDIFF(YEAR, r.dob, CURDATE()) AS age,
                   p.patient_uid AS mr_number, r.mobile, r.opd_reg_no AS op_number,
                   r.created_at AS date, doc.name AS doctor_name
            FROM op_registrations r
            JOIN patients p ON p.id = r.patient_id
            LEFT JOIN doctors doc ON doc.id = r.doctor_id
            WHERE (r.first_name LIKE %s OR r.mobile LIKE %s)
        """
        if start_date:
            sql += " AND DATE(r.created_at) >= %s"; params.append(start_date)
        if end_date:
            sql += " AND DATE(r.created_at) <= %s"; params.append(end_date)
        sql += " ORDER BY r.created_at DESC"
        results += query(sql, tuple(params), many=True)

    if rec_type in ("IP", "ALL"):
        params = [like, like]
        sql = """
            SELECT 'IP' AS type, p.name AS patient_name, r.gender, r.age,
                   p.patient_uid AS mr_number, r.mobile, r.ip_reg_no AS op_number,
                   r.created_at AS date, doc.name AS doctor_name
            FROM ip_registrations r
            JOIN patients p ON p.id = r.patient_id
            LEFT JOIN doctors doc ON doc.id = r.doctor_id
            WHERE (r.first_name LIKE %s OR r.mobile LIKE %s)
        """
        if start_date:
            sql += " AND DATE(r.created_at) >= %s"; params.append(start_date)
        if end_date:
            sql += " AND DATE(r.created_at) <= %s"; params.append(end_date)
        sql += " ORDER BY r.created_at DESC"
        results += query(sql, tuple(params), many=True)

    results.sort(key=lambda r: r["date"], reverse=True)
    return jsonify({"count": len(results), "results": results})