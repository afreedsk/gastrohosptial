from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

op_procedures_bp = Blueprint("op_procedures", __name__)

@op_procedures_bp.route("", methods=["GET"])
@jwt_required()
def list_op_procedures():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    patient_id = request.args.get("patient_id")

    sql = """
        SELECT pr.id, pr.op_registration_id, pr.procedure_name, pr.quantity, pr.rate, pr.amount,
               pr.created_at, p.name AS patient_name, r.opd_reg_no
        FROM op_procedures pr
        JOIN op_registrations r ON r.id = pr.op_registration_id
        JOIN patients p ON p.id = r.patient_id
        WHERE 1=1
    """
    params = []

    if patient_id:
        sql += " AND p.id = %s"
        params.append(patient_id)

    if search:
        sql += " AND (pr.procedure_name LIKE %s OR p.name LIKE %s OR r.opd_reg_no LIKE %s OR p.phone LIKE %s OR p.email LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like, like, like])

    if start_date:
        sql += " AND DATE(pr.created_at) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(pr.created_at) <= %s"
        params.append(end_date)

    sql += " ORDER BY pr.created_at DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@op_procedures_bp.route("", methods=["POST"])
@jwt_required()
def create_op_procedure():
    data = request.get_json()
    op_registration_id = data.get("op_registration_id")
    items = data.get("items")
    if not op_registration_id or not items:
        return jsonify({"error": "op_registration_id and items are required"}), 400

    registration = query("SELECT id FROM op_registrations WHERE id=%s", (op_registration_id,))
    if not registration:
        return jsonify({"error": "Invalid OP registration"}), 404

    for item in items:
        procedure_name = item.get("procedure_name")
        quantity = item.get("quantity", 1)
        rate = item.get("rate", 0)
        amount = item.get("amount", rate * quantity)
        if not procedure_name:
            continue
        query("""
            INSERT INTO op_procedures (op_registration_id, procedure_name, quantity, rate, amount)
            VALUES (%s, %s, %s, %s, %s)
        """, (op_registration_id, procedure_name, quantity, rate, amount),
        fetch=False, commit=True)

    return jsonify({"success": True}), 201

@op_procedures_bp.route("/catalog", methods=["GET"])
@jwt_required()
def get_procedure_catalog():
    search = request.args.get("search", "")
    procedure_type = request.args.get("procedure_type", "")
    sql = """
        SELECT id, procedure_type, procedure_name AS name, rate
        FROM procedure_catalog
        WHERE is_active = 1
    """
    params = []
    if search:
        sql += " AND (procedure_name LIKE %s OR procedure_type LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like])
    if procedure_type:
        sql += " AND procedure_type = %s"
        params.append(procedure_type)
    sql += " ORDER BY procedure_type, procedure_name"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@op_procedures_bp.route("/catalog/types", methods=["GET"])
@jwt_required()
def get_procedure_types():
    rows = query("SELECT DISTINCT procedure_type FROM procedure_catalog WHERE is_active = 1 ORDER BY procedure_type", many=True)
    return jsonify([r["procedure_type"] for r in rows])