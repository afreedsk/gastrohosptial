from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

op_lab_bp = Blueprint("op_lab", __name__)

@op_lab_bp.route("", methods=["GET"])
@jwt_required()
def list_op_lab():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    patient_id = request.args.get("patient_id")

    sql = """
        SELECT l.id, l.op_registration_id, l.item_name, l.quantity, l.rate, l.amount,
               l.created_at, p.name AS patient_name, r.opd_reg_no
        FROM op_lab l
        JOIN op_registrations r ON r.id = l.op_registration_id
        JOIN patients p ON p.id = r.patient_id
        WHERE 1=1
    """
    params = []

    if patient_id:
        sql += " AND p.id = %s"
        params.append(patient_id)

    if search:
        sql += " AND (l.item_name LIKE %s OR p.name LIKE %s OR r.opd_reg_no LIKE %s OR p.phone LIKE %s OR p.email LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like, like, like])

    if start_date:
        sql += " AND DATE(l.created_at) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(l.created_at) <= %s"
        params.append(end_date)

    sql += " ORDER BY l.created_at DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@op_lab_bp.route("", methods=["POST"])
@jwt_required()
def create_op_lab():
    data = request.get_json()
    op_registration_id = data.get("op_registration_id")
    items = data.get("items")
    if not op_registration_id or not items:
        return jsonify({"error": "op_registration_id and items are required"}), 400

    registration = query("SELECT id FROM op_registrations WHERE id=%s", (op_registration_id,))
    if not registration:
        return jsonify({"error": "Invalid OP registration"}), 404

    inserted = 0
    for item in items:
        item_name = item.get("item_name")
        quantity = item.get("quantity", 1)
        rate = item.get("rate", 0)
        amount = item.get("amount", rate * quantity)
        if not item_name:
            continue
        query("""
            INSERT INTO op_lab (op_registration_id, item_name, quantity, rate, amount)
            VALUES (%s, %s, %s, %s, %s)
        """, (op_registration_id, item_name, quantity, rate, amount),
        fetch=False, commit=True)
        inserted += 1

    return jsonify({"inserted": inserted}), 201

@op_lab_bp.route("/catalog", methods=["GET"])
@jwt_required()
def get_lab_catalog():
    search = request.args.get("search", "")
    department = request.args.get("department", "")
    sql = """
        SELECT id, department, investigation_name AS name, rate
        FROM lab_catalog
        WHERE is_active = 1
    """
    params = []
    if search:
        sql += " AND (investigation_name LIKE %s OR department LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like])
    if department:
        sql += " AND department = %s"
        params.append(department)
    sql += " ORDER BY department, investigation_name"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@op_lab_bp.route("/catalog/departments", methods=["GET"])
@jwt_required()
def get_lab_departments():
    rows = query("SELECT DISTINCT department FROM lab_catalog WHERE is_active = 1 ORDER BY department", many=True)
    return jsonify([r["department"] for r in rows])