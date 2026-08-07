from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from db import query
from utils import log_audit, role_required

billing_mgmt_bp = Blueprint("billing_management", __name__)

ACTION_TYPES = [
    "Consultation_Cancel", "Bill_Cancel", "Lab_Cancel", "Lab_Modify",
    "Service_Cancel", "Procedure_Cancel", "Surgery_Cancel",
    "Admission_Cancel", "Advance_Refund", "Advance_Adjustment", "Reprint"
]


def resolve_bill(bill_type, bill_no_or_id):
    """
    Accepts either the human-facing bill number (e.g. 'OPB-000002')
    or a raw numeric id, and returns the actual integer id of the row
    in op_bills / ip_bills. Returns None if not found.
    """
    table = "op_bills" if bill_type == "OP" else "ip_bills"
    raw = str(bill_no_or_id).strip()

    if raw.isdigit():
        row = query(f"SELECT id FROM {table} WHERE id=%s", (int(raw),))
    else:
        row = query(f"SELECT id FROM {table} WHERE bill_no=%s", (raw,))

    return row["id"] if row else None


@billing_mgmt_bp.route("/actions", methods=["POST"])
@jwt_required()
@role_required("admin", "super_admin")
def create_action():
    d = request.get_json()
    bill_type = d.get("bill_type")
    bill_ref = d.get("bill_id")  # can be bill_no ("OPB-000002") or numeric id
    action_type = d.get("action_type")
    reason = d.get("reason")

    if bill_type not in ["OP", "IP"] or action_type not in ACTION_TYPES:
        return jsonify({"error": "invalid bill_type or action_type"}), 400
    if not bill_ref:
        return jsonify({"error": "bill_id (or bill number) is required"}), 400
    if not reason:
        return jsonify({"error": "reason is required for audit purposes"}), 400

    resolved_id = resolve_bill(bill_type, bill_ref)
    if resolved_id is None:
        return jsonify({"error": f"No {bill_type} bill found matching '{bill_ref}'"}), 404

    user_id = get_jwt_identity()
    action_id = query("""
        INSERT INTO billing_actions (bill_type, bill_id, action_type, amount, reason, performed_by, approved_by)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (bill_type, resolved_id, action_type, d.get("amount", 0), reason, user_id, user_id),
    fetch=False, commit=True)

    table = "op_bills" if bill_type == "OP" else "ip_bills"
    if action_type in ("Bill_Cancel", "Consultation_Cancel"):
        query(f"UPDATE {table} SET status='Cancelled' WHERE id=%s", (resolved_id,), fetch=False, commit=True)

    log_audit(user_id, action_type, "Billing Management", resolved_id, reason)
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


@billing_mgmt_bp.route("/reprint/<string:bill_type>/<string:bill_ref>", methods=["GET"])
@jwt_required()
def reprint(bill_type, bill_ref):
    bt = bill_type.upper()
    resolved_id = resolve_bill(bt, bill_ref)
    if resolved_id is None:
        return jsonify({"error": "Bill not found"}), 404

    table = "op_bills" if bt == "OP" else "ip_bills"
    bill = query(f"SELECT * FROM {table} WHERE id=%s", (resolved_id,))
    log_audit(get_jwt_identity(), "Reprint", "Billing Management", resolved_id)
    return jsonify(bill)