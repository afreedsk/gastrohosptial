from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

pharmacy_items_bp = Blueprint("pharmacy_items", __name__)


@pharmacy_items_bp.route("/stores", methods=["GET"])
@jwt_required()
def list_stores():
    return jsonify(query("SELECT id, name FROM pharmacy_stores ORDER BY name", many=True))


@pharmacy_items_bp.route("", methods=["GET"])
@jwt_required()
def search_items():
    search = request.args.get("search", "")
    store_id = request.args.get("store_id")
    like = f"%{search}%"

    sql = """
        SELECT id, name, batch_no, old_tax_percent, new_tax_percent, grn_id, mrp, stock_qty
        FROM pharmacy_items
        WHERE is_active=1 AND name LIKE %s
    """
    params = [like]
    if store_id:
        sql += " AND store_id=%s"
        params.append(store_id)
    sql += " ORDER BY name LIMIT 20"

    return jsonify(query(sql, tuple(params), many=True))


@pharmacy_items_bp.route("/by-barcode/<code>", methods=["GET"])
@jwt_required()
def by_barcode(code):
    # Placeholder: no barcode column exists yet. Falls back to exact name
    # match so the barcode input isn't a dead end.
    row = query("SELECT id, name, batch_no, old_tax_percent, new_tax_percent, grn_id, mrp, stock_qty "
                "FROM pharmacy_items WHERE name=%s LIMIT 1", (code,))
    if not row:
        return jsonify({"error": "Item not found for this barcode"}), 404
    return jsonify(row)