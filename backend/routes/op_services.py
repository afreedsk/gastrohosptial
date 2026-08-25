from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

op_services_bp = Blueprint("op_services", __name__)

@op_services_bp.route("", methods=["GET"])
@jwt_required()
def list_op_services():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    patient_id = request.args.get("patient_id")

    sql = """
        SELECT s.id, s.op_registration_id, s.service_name, s.quantity, s.rate, s.amount,
               s.created_at, p.name AS patient_name, r.opd_reg_no
        FROM op_services s
        JOIN op_registrations r ON r.id = s.op_registration_id
        JOIN patients p ON p.id = r.patient_id
        WHERE 1=1
    """
    params = []

    if patient_id:
        sql += " AND p.id = %s"
        params.append(patient_id)

    if search:
        sql += " AND (s.service_name LIKE %s OR p.name LIKE %s OR r.opd_reg_no LIKE %s OR p.phone LIKE %s OR p.email LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like, like, like])

    if start_date:
        sql += " AND DATE(s.created_at) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(s.created_at) <= %s"
        params.append(end_date)

    sql += " ORDER BY s.created_at DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@op_services_bp.route("", methods=["POST"])
@jwt_required()
def create_op_service():
    data = request.get_json()
    op_registration_id = data.get("op_registration_id")
    items = data.get("items")
    if not op_registration_id or not items:
        return jsonify({"error": "op_registration_id and items are required"}), 400

    registration = query("SELECT id FROM op_registrations WHERE id=%s", (op_registration_id,))
    if not registration:
        return jsonify({"error": "Invalid OP registration"}), 404

    for item in items:
        service_name = item.get("service_name")
        quantity = item.get("quantity", 1)
        rate = item.get("rate", 0)
        amount = item.get("amount", rate * quantity)
        if not service_name:
            continue
        query("""
            INSERT INTO op_services (op_registration_id, service_name, quantity, rate, amount)
            VALUES (%s, %s, %s, %s, %s)
        """, (op_registration_id, service_name, quantity, rate, amount),
        fetch=False, commit=True)

    return jsonify({"success": True}), 201

@op_services_bp.route("/catalog", methods=["GET"])
@jwt_required()
def get_service_catalog():
    search = request.args.get("search", "")
    service_type = request.args.get("service_type", "")
    sql = """
        SELECT id, service_type, service_name AS name, rate
        FROM service_catalog
        WHERE is_active = 1
    """
    params = []
    if search:
        sql += " AND (service_name LIKE %s OR service_type LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like])
    if service_type:
        sql += " AND service_type = %s"
        params.append(service_type)
    sql += " ORDER BY service_type, service_name"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@op_services_bp.route("/catalog/types", methods=["GET"])
@jwt_required()
def get_service_types():
    rows = query("SELECT DISTINCT service_type FROM service_catalog WHERE is_active = 1 ORDER BY service_type", many=True)
    return jsonify([r["service_type"] for r in rows])