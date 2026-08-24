from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

ip_services_bp = Blueprint("ip_services", __name__)

# GET – list service items with search & date filters
@ip_services_bp.route("", methods=["GET"])
@jwt_required()
def list_ip_services():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    sql = """
        SELECT s.id, s.ip_registration_id, s.service_name, s.quantity, s.rate, s.amount,
               s.created_at, p.name AS patient_name, r.ip_reg_no
        FROM ip_services s
        JOIN ip_registrations r ON r.id = s.ip_registration_id
        JOIN patients p ON p.id = r.patient_id
        WHERE 1=1
    """
    params = []
    
    if search:
        sql += " AND (s.service_name LIKE %s OR p.name LIKE %s OR r.ip_reg_no LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like])
    
    if start_date:
        sql += " AND DATE(s.created_at) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(s.created_at) <= %s"
        params.append(end_date)
    
    sql += " ORDER BY s.created_at DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

# POST – save selected service items for an IP admission
@ip_services_bp.route("", methods=["POST"])
@jwt_required()
def create_ip_service():
    data = request.get_json()
    ip_registration_id = data.get("ip_registration_id")
    items = data.get("items")
    if not ip_registration_id or not items:
        return jsonify({"error": "ip_registration_id and items are required"}), 400

    admission = query("SELECT id FROM ip_registrations WHERE id=%s", (ip_registration_id,))
    if not admission:
        return jsonify({"error": "Invalid admission"}), 404

    for item in items:
        service_name = item.get("service_name")
        quantity = item.get("quantity", 1)
        rate = item.get("rate", 0)
        amount = item.get("amount", rate * quantity)
        if not service_name:
            continue
        query("""
            INSERT INTO ip_services (ip_registration_id, service_name, quantity, rate, amount)
            VALUES (%s, %s, %s, %s, %s)
        """, (ip_registration_id, service_name, quantity, rate, amount),
        fetch=False, commit=True)

    return jsonify({"success": True}), 201