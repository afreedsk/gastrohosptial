from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

ot_indents_bp = Blueprint("ot_indents", __name__)


@ot_indents_bp.route("", methods=["POST"])
@jwt_required()
def create_indent():
    d = request.get_json() or {}
    required = ["indent_date", "indent_raised_for", "item_details"]
    if not all(d.get(f) for f in required):
        return jsonify({"error": "indent_date, indent_raised_for and item_details are required"}), 400

    user_id = get_jwt_identity()
    iid = query("""
        INSERT INTO ot_indents (indent_date, indent_raised_for, indent_provided_to, item_details, created_by)
        VALUES (%s,%s,%s,%s,%s)
    """, (d["indent_date"], d["indent_raised_for"], d.get("indent_provided_to"),
          d["item_details"], user_id), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "OT Indent", iid)
    return jsonify(query("SELECT * FROM ot_indents WHERE id=%s", (iid,))), 201


@ot_indents_bp.route("", methods=["GET"])
@jwt_required()
def list_indents():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    search = request.args.get("search", "")
    like = f"%{search}%"

    sql = """
        SELECT oi.*, u.name AS created_by_name FROM ot_indents oi
        LEFT JOIN users u ON u.id = oi.created_by
        WHERE (oi.indent_raised_for LIKE %s OR oi.item_details LIKE %s)
    """
    params = [like, like]
    if start_date:
        sql += " AND oi.indent_date >= %s"; params.append(start_date)
    if end_date:
        sql += " AND oi.indent_date <= %s"; params.append(end_date)
    sql += " ORDER BY oi.id DESC"

    return jsonify(query(sql, tuple(params), many=True))


@ot_indents_bp.route("/<int:indent_id>/return", methods=["PATCH"])
@jwt_required()
def mark_return(indent_id):
    row = query("SELECT id FROM ot_indents WHERE id=%s", (indent_id,))
    if not row:
        return jsonify({"error": "Indent not found"}), 404

    query("UPDATE ot_indents SET indent_return='Returned' WHERE id=%s", (indent_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "RETURN", "OT Indent", indent_id)
    return jsonify(query("SELECT * FROM ot_indents WHERE id=%s", (indent_id,)))