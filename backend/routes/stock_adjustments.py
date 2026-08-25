from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

stock_adj_bp = Blueprint("stock_adjustments", __name__)

def blank_to_none(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

# ---------- LIST ADJUSTMENTS ----------
@stock_adj_bp.route("", methods=["GET"])
@jwt_required()
def list_adjustments():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    sql = """
        SELECT sa.id, sa.adjustment_no, sa.adjustment_date,
               pi.item_name, sa.batch_no, sa.exp_date,
               sa.quantity, sa.mrp, sa.rate, sa.eff_rate, sa.tax_percent,
               grn.grn_no, s.name AS supplier_name,
               sa.reason, sa.status, sa.created_at,
               u.name AS created_by_name
        FROM stock_adjustments sa
        JOIN pharmacy_items pi ON pi.id = sa.item_id
        LEFT JOIN grn ON grn.id = sa.grn_id
        LEFT JOIN suppliers s ON s.id = sa.supplier_id
        LEFT JOIN users u ON u.id = sa.created_by
        WHERE 1=1
    """
    params = []
    
    if search:
        sql += " AND (sa.adjustment_no LIKE %s OR pi.item_name LIKE %s OR sa.batch_no LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like])
    
    if start_date:
        sql += " AND DATE(sa.adjustment_date) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(sa.adjustment_date) <= %s"
        params.append(end_date)
    
    sql += " ORDER BY sa.id DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

# ---------- GET SINGLE ADJUSTMENT ----------
@stock_adj_bp.route("/<int:adj_id>", methods=["GET"])
@jwt_required()
def get_adjustment(adj_id):
    row = query("""
        SELECT sa.*, pi.item_name, grn.grn_no, s.name AS supplier_name
        FROM stock_adjustments sa
        JOIN pharmacy_items pi ON pi.id = sa.item_id
        LEFT JOIN grn ON grn.id = sa.grn_id
        LEFT JOIN suppliers s ON s.id = sa.supplier_id
        WHERE sa.id=%s
    """, (adj_id,))
    if not row:
        return jsonify({"error": "Adjustment not found"}), 404
    return jsonify(row)

# ---------- CREATE/UPDATE ADJUSTMENT ----------
@stock_adj_bp.route("", methods=["POST"])
@jwt_required()
def upsert_adjustment():
    data = request.get_json()
    adj_id = data.get("id")
    user_id = get_jwt_identity()
    
    if not data.get("adjustment_date") or not data.get("item_id"):
        return jsonify({"error": "adjustment_date and item_id are required"}), 400
    
    adjustment_no = data.get("adjustment_no")
    adjustment_date = data.get("adjustment_date")
    item_id = data.get("item_id")
    batch_no = blank_to_none(data.get("batch_no"))
    exp_date = blank_to_none(data.get("exp_date"))
    quantity = data.get("quantity", 0)
    mrp = data.get("mrp", 0)
    rate = data.get("rate", 0)
    eff_rate = data.get("eff_rate", 0)
    tax_percent = data.get("tax_percent", 0)
    grn_id = blank_to_none(data.get("grn_id"))
    supplier_id = blank_to_none(data.get("supplier_id"))
    reason = blank_to_none(data.get("reason"))
    status = data.get("status", "Draft")
    
    if adj_id:
        # UPDATE
        query("""
            UPDATE stock_adjustments
            SET adjustment_date=%s, item_id=%s, batch_no=%s, exp_date=%s,
                quantity=%s, mrp=%s, rate=%s, eff_rate=%s, tax_percent=%s,
                grn_id=%s, supplier_id=%s, reason=%s, status=%s
            WHERE id=%s
        """, (adjustment_date, item_id, batch_no, exp_date,
              quantity, mrp, rate, eff_rate, tax_percent,
              grn_id, supplier_id, reason, status, adj_id),
        fetch=False, commit=True)
        log_audit(user_id, "UPDATE", "Stock Adjustment", adj_id)
    else:
        # Generate adjustment number
        adjustment_no = next_code("ADJ", "stock_adjustments", "adjustment_no")
        
        adj_id = query("""
            INSERT INTO stock_adjustments (
                adjustment_no, adjustment_date, item_id, batch_no, exp_date,
                quantity, mrp, rate, eff_rate, tax_percent,
                grn_id, supplier_id, reason, status, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (adjustment_no, adjustment_date, item_id, batch_no, exp_date,
              quantity, mrp, rate, eff_rate, tax_percent,
              grn_id, supplier_id, reason, status, user_id),
        fetch=False, commit=True)
        log_audit(user_id, "CREATE", "Stock Adjustment", adj_id)
    
    return jsonify({"id": adj_id, "adjustment_no": adjustment_no}), 201

# ---------- DELETE ADJUSTMENT ----------
@stock_adj_bp.route("/<int:adj_id>", methods=["DELETE"])
@jwt_required()
def delete_adjustment(adj_id):
    row = query("SELECT id, status FROM stock_adjustments WHERE id=%s", (adj_id,))
    if not row:
        return jsonify({"error": "Adjustment not found"}), 404
    if row["status"] == "Approved":
        return jsonify({"error": "Cannot delete Approved adjustment"}), 400
    
    query("DELETE FROM stock_adjustments WHERE id=%s", (adj_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DELETE", "Stock Adjustment", adj_id)
    return jsonify({"success": True}), 200

# ---------- GET ITEMS FOR ADJUSTMENT (with GRN & supplier lookup) ----------
@stock_adj_bp.route("/items", methods=["GET"])
@jwt_required()
def item_search():
    search = request.args.get("q", "")
    sql = """
        SELECT pi.id, pi.item_name, pi.item_code, pi.unit,
               gi.batch_no, gi.exp_date, gi.mrp, gi.rate, gi.eff_rate, gi.tax_percent,
               grn.grn_no, s.name AS supplier_name
        FROM pharmacy_items pi
        LEFT JOIN grn_items gi ON gi.item_id = pi.id
        LEFT JOIN grn ON grn.id = gi.grn_id
        LEFT JOIN suppliers s ON s.id = grn.supplier_id
        WHERE pi.item_name LIKE %s OR pi.item_code LIKE %s
        GROUP BY pi.id, gi.batch_no
        LIMIT 20
    """
    like = f"%{search}%"
    rows = query(sql, (like, like), many=True)
    return jsonify(rows)