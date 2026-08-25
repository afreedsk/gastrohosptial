from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit
from datetime import date

grn_bp = Blueprint("grn", __name__)

def blank_to_none(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

# ---------- LIST GRNs ----------
@grn_bp.route("", methods=["GET"])
@jwt_required()
def list_grn():
    search = request.args.get("search", "")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    sql = """
        SELECT g.id, g.grn_no, g.grn_date, g.invoice_no, g.invoice_date,
               s.name AS supplier_name, g.supplier_mobile,
               g.total_amount, g.status, g.remarks, g.created_at,
               u.name AS created_by_name
        FROM grn g
        LEFT JOIN suppliers s ON s.id = g.supplier_id
        LEFT JOIN users u ON u.id = g.created_by
        WHERE 1=1
    """
    params = []
    
    if search:
        sql += " AND (g.grn_no LIKE %s OR g.invoice_no LIKE %s OR s.name LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like])
    
    if start_date:
        sql += " AND DATE(g.grn_date) >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND DATE(g.grn_date) <= %s"
        params.append(end_date)
    
    sql += " ORDER BY g.id DESC"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

# ---------- GET SINGLE GRN (with items) ----------
@grn_bp.route("/<int:grn_id>", methods=["GET"])
@jwt_required()
def get_grn(grn_id):
    # Main GRN
    grn = query("""
        SELECT g.*, s.name AS supplier_name
        FROM grn g
        LEFT JOIN suppliers s ON s.id = g.supplier_id
        WHERE g.id=%s
    """, (grn_id,))
    if not grn:
        return jsonify({"error": "GRN not found"}), 404
    
    # Items
    items = query("""
        SELECT gi.*, pi.item_name, pi.item_code
        FROM grn_items gi
        JOIN pharmacy_items pi ON pi.id = gi.item_id
        WHERE gi.grn_id=%s
    """, (grn_id,), many=True)
    
    grn["items"] = items
    return jsonify(grn)

# ---------- CREATE/UPDATE GRN ----------
@grn_bp.route("", methods=["POST"])
@jwt_required()
def upsert_grn():
    data = request.get_json()
    grn_id = data.get("id")
    user_id = get_jwt_identity()
    
    # Validate required fields
    if not data.get("grn_date"):
        return jsonify({"error": "GRN date is required"}), 400
    
    # Extract fields
    grn_no = data.get("grn_no")
    grn_date = data.get("grn_date")
    invoice_no = blank_to_none(data.get("invoice_no"))
    invoice_date = blank_to_none(data.get("invoice_date"))
    supplier_id = blank_to_none(data.get("supplier_id"))
    supplier_mobile = blank_to_none(data.get("supplier_mobile"))
    total_amount = data.get("total_amount", 0) or 0
    status = data.get("status", "Draft")
    remarks = blank_to_none(data.get("remarks"))
    items = data.get("items", [])
    
    if grn_id:
        # UPDATE existing GRN
        query("""
            UPDATE grn
            SET grn_date=%s, invoice_no=%s, invoice_date=%s,
                supplier_id=%s, supplier_mobile=%s, total_amount=%s,
                status=%s, remarks=%s
            WHERE id=%s
        """, (grn_date, invoice_no, invoice_date, supplier_id, supplier_mobile,
              total_amount, status, remarks, grn_id),
        fetch=False, commit=True)
        
        # Delete existing items and re-insert
        query("DELETE FROM grn_items WHERE grn_id=%s", (grn_id,), fetch=False, commit=True)
        
        log_audit(user_id, "UPDATE", "GRN", grn_id)
    else:
        # Generate GRN number
        grn_no = next_code("GRN", "grn", "grn_no")
        
        # INSERT new GRN
        grn_id = query("""
            INSERT INTO grn (
                grn_no, grn_date, invoice_no, invoice_date,
                supplier_id, supplier_mobile, total_amount,
                status, remarks, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (grn_no, grn_date, invoice_no, invoice_date,
              supplier_id, supplier_mobile, total_amount,
              status, remarks, user_id),
        fetch=False, commit=True)
        
        log_audit(user_id, "CREATE", "GRN", grn_id)
    
    # Insert items
    for item in items:
        query("""
            INSERT INTO grn_items (
                grn_id, item_id, batch_no, exp_date, quantity,
                mrp, rate, eff_rate, tax_percent, amount
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            grn_id,
            item.get("item_id"),
            blank_to_none(item.get("batch_no")),
            blank_to_none(item.get("exp_date")),
            item.get("quantity", 0),
            item.get("mrp", 0),
            item.get("rate", 0),
            item.get("eff_rate", 0),
            item.get("tax_percent", 0),
            item.get("amount", 0)
        ), fetch=False, commit=True)
    
    return jsonify({"id": grn_id, "grn_no": grn_no}), 201

# ---------- DELETE GRN ----------
@grn_bp.route("/<int:grn_id>", methods=["DELETE"])
@jwt_required()
def delete_grn(grn_id):
    # Check if exists
    grn = query("SELECT id, status FROM grn WHERE id=%s", (grn_id,))
    if not grn:
        return jsonify({"error": "GRN not found"}), 404
    if grn["status"] not in ("Draft", "Received"):
        return jsonify({"error": "Cannot delete Approved or Returned GRN"}), 400
    
    query("DELETE FROM grn WHERE id=%s", (grn_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DELETE", "GRN", grn_id)
    return jsonify({"success": True}), 200

# ---------- SUPPLIER AUTOCOMPLETE ----------
@grn_bp.route("/suppliers", methods=["GET"])
@jwt_required()
def supplier_search():
    search = request.args.get("q", "")
    sql = "SELECT id, name, phone, email FROM suppliers WHERE name LIKE %s OR phone LIKE %s LIMIT 20"
    like = f"%{search}%"
    rows = query(sql, (like, like), many=True)
    return jsonify(rows)

# ---------- ITEM AUTOCOMPLETE ----------
@grn_bp.route("/items", methods=["GET"])
@jwt_required()
def item_search():
    search = request.args.get("q", "")
    sql = """
        SELECT id, item_name, item_code, unit
        FROM pharmacy_items
        WHERE item_name LIKE %s OR item_code LIKE %s
        LIMIT 20
    """
    like = f"%{search}%"
    rows = query(sql, (like, like), many=True)
    return jsonify(rows)