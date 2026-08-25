from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit

suppliers_bp = Blueprint("suppliers", __name__)

def blank_to_none(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

# ---------- LIST SUPPLIERS ----------
@suppliers_bp.route("", methods=["GET"])
@jwt_required()
def list_suppliers():
    search = request.args.get("search", "")
    is_active = request.args.get("is_active")  # optional filter
    
    sql = """
        SELECT id, name, inventory_type, vat_no, contact_person, contact_no,
               email, gst_no, pincode, address, fax, alt_contact_no,
               website, remarks, apgst_no, cst_no, dl_no, pan_no,
               is_active, is_igst_tax, created_at, updated_at
        FROM suppliers
        WHERE 1=1
    """
    params = []
    
    if search:
        sql += " AND (name LIKE %s OR contact_person LIKE %s OR email LIKE %s OR phone LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like, like])
    
    if is_active is not None:
        sql += " AND is_active = %s"
        params.append(1 if is_active in ('1', 'true', 'True') else 0)
    
    sql += " ORDER BY name"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

# ---------- GET SINGLE SUPPLIER ----------
@suppliers_bp.route("/<int:supplier_id>", methods=["GET"])
@jwt_required()
def get_supplier(supplier_id):
    row = query("SELECT * FROM suppliers WHERE id=%s", (supplier_id,))
    if not row:
        return jsonify({"error": "Supplier not found"}), 404
    return jsonify(row)

# ---------- CREATE / UPDATE SUPPLIER ----------
@suppliers_bp.route("", methods=["POST"])
@jwt_required()
def upsert_supplier():
    data = request.get_json()
    supplier_id = data.get("id")
    user_id = get_jwt_identity()
    
    # Extract fields (all optional except name)
    name = data.get("name")
    if not name:
        return jsonify({"error": "Supplier name is required"}), 400
    
    inventory_type = blank_to_none(data.get("inventory_type"))
    vat_no = blank_to_none(data.get("vat_no"))
    contact_person = blank_to_none(data.get("contact_person"))
    contact_no = blank_to_none(data.get("contact_no"))
    email = blank_to_none(data.get("email"))
    gst_no = blank_to_none(data.get("gst_no"))
    pincode = blank_to_none(data.get("pincode"))
    address = blank_to_none(data.get("address"))
    fax = blank_to_none(data.get("fax"))
    alt_contact_no = blank_to_none(data.get("alt_contact_no"))
    website = blank_to_none(data.get("website"))
    remarks = blank_to_none(data.get("remarks"))
    apgst_no = blank_to_none(data.get("apgst_no"))
    cst_no = blank_to_none(data.get("cst_no"))
    dl_no = blank_to_none(data.get("dl_no"))
    pan_no = blank_to_none(data.get("pan_no"))
    is_active = 1 if data.get("is_active") else 0
    is_igst_tax = 1 if data.get("is_igst_tax") else 0
    
    if supplier_id:
        # UPDATE
        query("""
            UPDATE suppliers
            SET name=%s, inventory_type=%s, vat_no=%s, contact_person=%s,
                contact_no=%s, email=%s, gst_no=%s, pincode=%s,
                address=%s, fax=%s, alt_contact_no=%s, website=%s,
                remarks=%s, apgst_no=%s, cst_no=%s, dl_no=%s,
                pan_no=%s, is_active=%s, is_igst_tax=%s
            WHERE id=%s
        """, (name, inventory_type, vat_no, contact_person,
              contact_no, email, gst_no, pincode,
              address, fax, alt_contact_no, website,
              remarks, apgst_no, cst_no, dl_no,
              pan_no, is_active, is_igst_tax, supplier_id),
        fetch=False, commit=True)
        log_audit(user_id, "UPDATE", "Supplier", supplier_id)
    else:
        # INSERT
        supplier_id = query("""
            INSERT INTO suppliers (
                name, inventory_type, vat_no, contact_person,
                contact_no, email, gst_no, pincode,
                address, fax, alt_contact_no, website,
                remarks, apgst_no, cst_no, dl_no,
                pan_no, is_active, is_igst_tax
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                      %s, %s, %s, %s, %s, %s, %s, %s,
                      %s, %s, %s)
        """, (name, inventory_type, vat_no, contact_person,
              contact_no, email, gst_no, pincode,
              address, fax, alt_contact_no, website,
              remarks, apgst_no, cst_no, dl_no,
              pan_no, is_active, is_igst_tax),
        fetch=False, commit=True)
        log_audit(user_id, "CREATE", "Supplier", supplier_id)
    
    return jsonify({"id": supplier_id, "name": name}), 201

# ---------- DELETE SUPPLIER ----------
@suppliers_bp.route("/<int:supplier_id>", methods=["DELETE"])
@jwt_required()
def delete_supplier(supplier_id):
    row = query("SELECT id FROM suppliers WHERE id=%s", (supplier_id,))
    if not row:
        return jsonify({"error": "Supplier not found"}), 404
    # Check if used in GRN or other tables
    used = query("SELECT id FROM grn WHERE supplier_id=%s LIMIT 1", (supplier_id,))
    if used:
        return jsonify({"error": "Cannot delete supplier – already used in GRN"}), 400
    query("DELETE FROM suppliers WHERE id=%s", (supplier_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DELETE", "Supplier", supplier_id)
    return jsonify({"success": True}), 200