from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

direct_services_bp = Blueprint("direct_services", __name__)


@direct_services_bp.route("", methods=["GET"])
@jwt_required()
def list_direct_services():
    start_date = request.args.get("start_date") or date.today().isoformat()
    end_date = request.args.get("end_date") or date.today().isoformat()

    rows = query("""
        SELECT b.id, p.patient_uid AS mr_number, p.reg_no AS reg_no,
               p.name AS full_name, p.gender, p.age, p.phone,
               NULL AS doctor_name, b.created_at AS date, b.net_total AS amount,
               b.status AS bill_status
        FROM op_bills b
        JOIN patients p ON p.id = b.patient_id
        WHERE b.appointment_id IS NULL
          AND DATE(b.created_at) BETWEEN %s AND %s
        ORDER BY b.created_at DESC
    """, (start_date, end_date), many=True)
    return jsonify(rows)