from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

pharmacy_sales_bp = Blueprint("pharmacy_sales", __name__)


def compute_totals(items, discount_percent, paid_amount):
    total = sum(float(i.get("qty", 0)) * float(i.get("mrp", 0)) for i in items)
    total = round(total, 2)
    discount_amount = round(total * float(discount_percent or 0) / 100, 2)
    net = round(max(0, total - discount_amount), 2)
    paid = float(paid_amount or 0)
    due = round(max(0, net - paid), 2)
    return total, discount_amount, net, due


@pharmacy_sales_bp.route("", methods=["POST"])
@jwt_required()
def create_sale():
    d = request.get_json() or {}
    sale_type = d.get("sale_type")  # 'IP' | 'OP' | 'Direct'
    items = d.get("items", [])

    if sale_type not in ("IP", "OP", "Direct"):
        return jsonify({"error": "sale_type must be IP, OP, or Direct"}), 400
    if not items:
        return jsonify({"error": "At least one item is required"}), 400

    store_id = d.get("store_id")
    if not store_id:
        return jsonify({"error": "store_id is required"}), 400

    total, discount_amount, net, due = compute_totals(items, d.get("discount_percent", 0), d.get("paid_amount", 0))
    status = "Draft" if d.get("save_as_draft") else "Submitted"
    user_id = get_jwt_identity()
    sale_no = next_code("PS", "pharmacy_sales", "sale_no")

    sid = query("""
        INSERT INTO pharmacy_sales (
            sale_no, sale_type, patient_id, ip_registration_id, op_registration_id, doctor_id,
            store_id, total_amount, discount_percent, discount_amount, net_amount,
            payment_mode, paid_amount, due_amount, remarks, status, created_by
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        sale_no, sale_type, d.get("patient_id"), d.get("ip_registration_id"), d.get("op_registration_id"),
        d.get("doctor_id"), store_id, total, d.get("discount_percent", 0), discount_amount, net,
        d.get("payment_mode", "Cash"), d.get("paid_amount", 0), due, d.get("remarks"), status, user_id
    ), fetch=False, commit=True)

    for item in items:
        qty = float(item.get("qty", 0))
        mrp = float(item.get("mrp", 0))
        query("""
            INSERT INTO pharmacy_sale_items (
                sale_id, item_id, item_name, batch_no, old_tax_percent, new_tax_percent,
                grn_id, qty, mrp, amount
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            sid, item.get("item_id"), item.get("item_name"), item.get("batch_no"),
            item.get("old_tax_percent", 0), item.get("new_tax_percent", 0), item.get("grn_id"),
            qty, mrp, round(qty * mrp, 2)
        ), fetch=False, commit=True)

    log_audit(user_id, "CREATE", f"Pharmacy {sale_type} Sale", sid)
    sale = query("SELECT * FROM pharmacy_sales WHERE id=%s", (sid,))
    sale["items"] = query("SELECT * FROM pharmacy_sale_items WHERE sale_id=%s", (sid,), many=True)
    return jsonify(sale), 201


@pharmacy_sales_bp.route("", methods=["GET"])
@jwt_required()
def list_sales():
    sale_type = request.args.get("sale_type")
    status = request.args.get("status")

    sql = "SELECT * FROM pharmacy_sales WHERE 1=1"
    params = []
    if sale_type:
        sql += " AND sale_type=%s"
        params.append(sale_type)
    if status:
        sql += " AND status=%s"
        params.append(status)
    sql += " ORDER BY id DESC"

    return jsonify(query(sql, tuple(params), many=True))


@pharmacy_sales_bp.route("/drafts", methods=["GET"])
@jwt_required()
def list_drafts():
    sale_type = request.args.get("sale_type")
    sql = "SELECT * FROM pharmacy_sales WHERE status='Draft'"
    params = []
    if sale_type:
        sql += " AND sale_type=%s"
        params.append(sale_type)
    sql += " ORDER BY id DESC"
    return jsonify(query(sql, tuple(params), many=True))


@pharmacy_sales_bp.route("/<int:sale_id>", methods=["GET"])
@jwt_required()
def get_sale(sale_id):
    sale = query("SELECT * FROM pharmacy_sales WHERE id=%s", (sale_id,))
    if not sale:
        return jsonify({"error": "Sale not found"}), 404
    sale["items"] = query("SELECT * FROM pharmacy_sale_items WHERE sale_id=%s", (sale_id,), many=True)
    return jsonify(sale)