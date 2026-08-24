from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

ip_lab_bp = Blueprint("ip_lab", __name__)

# GET – list lab items with search & date filters
@ip_lab_bp.route("", methods=["GET"])
@jwt_required()
def list_ip_lab():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    sql = """
        SELECT l.id, l.ip_registration_id, l.item_name, l.quantity, l.rate, l.amount,
               l.created_at, p.name AS patient_name, r.ip_reg_no
        FROM ip_lab l
        JOIN ip_registrations r ON r.id = l.ip_registration_id
        JOIN patients p ON p.id = r.patient_id
        WHERE 1=1
    """
    params = []
    
    if search:
        sql += " AND (l.item_name LIKE %s OR p.name LIKE %s OR r.ip_reg_no LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like])
    
    if start_date:
        sql += " AND DATE(l.created_at) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(l.created_at) <= %s"
        params.append(end_date)
    
    sql += " ORDER BY l.created_at DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

# POST – save selected lab items for an IP admission
@ip_lab_bp.route("", methods=["POST"])
@jwt_required()
def create_ip_lab():
    data = request.get_json()
    ip_registration_id = data.get("ip_registration_id")
    items = data.get("items")  # list of {item_name, quantity, rate, amount}
    if not ip_registration_id or not items:
        return jsonify({"error": "ip_registration_id and items are required"}), 400

    admission = query("SELECT id FROM ip_registrations WHERE id=%s", (ip_registration_id,))
    if not admission:
        return jsonify({"error": "Invalid admission"}), 404

    inserted = 0
    for item in items:
        item_name = item.get("item_name")
        quantity = item.get("quantity", 1)
        rate = item.get("rate", 0)
        amount = item.get("amount", rate * quantity)
        if not item_name:
            continue
        query("""
            INSERT INTO ip_lab (ip_registration_id, item_name, quantity, rate, amount)
            VALUES (%s, %s, %s, %s, %s)
        """, (ip_registration_id, item_name, quantity, rate, amount),
        fetch=False, commit=True)
        inserted += 1

    return jsonify({"inserted": inserted}), 201