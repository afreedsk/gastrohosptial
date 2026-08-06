from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from db import query
from utils import log_audit, role_required

billing_mgmt_bp = Blueprint("billing_management", __name__)

# Actions that only require reason + amount, applied to OP or IP bills
ACTION_TYPES = [
    "Consultation_Cancel", "Bill_Cancel", "Lab_Cancel", "Lab_Modify",
    "Service_Cancel", "Procedure_Cancel", "Surgery_Cancel",
    "Admission_Cancel", "Advance_Refund", "Advance_Adjustment", "Reprint"
]


@billing_mgmt_bp.route("/actions", methods=["POST"])
@jwt_required()
@role_required("admin", "super_admin")  # modifications/cancellations require approval-level role
def create_action():
    d = request.get_json()
    bill_type = d.get("bill_type")
    bill_id = d.get("bill_id")
    action_type = d.get("action_type")
    reason = d.get("reason")

    if bill_type not in ["OP", "IP"] or action_type not in ACTION_TYPES:
        return jsonify({"error": "invalid bill_type or action_type"}), 400
    if not reason:
        return jsonify({"error": "reason is required for audit purposes"}), 400

    user_id = get_jwt_identity()
    action_id = query("""
        INSERT INTO billing_actions (bill_type, bill_id, action_type, amount, reason, performed_by, approved_by)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (bill_type, bill_id, action_type, d.get("amount", 0), reason, user_id, user_id),
    fetch=False, commit=True)

    # apply side-effects
    table = "op_bills" if bill_type == "OP" else "ip_bills"
    if action_type in ("Bill_Cancel", "Consultation_Cancel"):
        query(f"UPDATE {table} SET status='Cancelled' WHERE id=%s", (bill_id,), fetch=False, commit=True)

    log_audit(user_id, action_type, "Billing Management", bill_id, reason)
    return jsonify(query("SELECT * FROM billing_actions WHERE id=%s", (action_id,))), 201


@billing_mgmt_bp.route("/actions", methods=["GET"])
@jwt_required()
def list_actions():
    bill_type = request.args.get("bill_type")
    sql = """SELECT ba.*, u.name AS performed_by_name FROM billing_actions ba
              LEFT JOIN users u ON u.id=ba.performed_by WHERE 1=1"""
    params = []
    if bill_type:
        sql += " AND ba.bill_type=%s"
        params.append(bill_type)
    sql += " ORDER BY ba.id DESC"
    return jsonify(query(sql, tuple(params), many=True))


@billing_mgmt_bp.route("/reprint/<string:bill_type>/<int:bill_id>", methods=["GET"])
@jwt_required()
def reprint(bill_type, bill_id):
    table = "op_bills" if bill_type.upper() == "OP" else "ip_bills"
    bill = query(f"SELECT * FROM {table} WHERE id=%s", (bill_id,))
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    log_audit(get_jwt_identity(), "Reprint", "Billing Management", bill_id)
    return jsonify(bill)
