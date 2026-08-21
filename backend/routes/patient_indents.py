from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit

patient_indents_bp = Blueprint("patient_indents", __name__)


@patient_indents_bp.route("", methods=["POST"])
@jwt_required()
def create_indent():
    d = request.get_json() or {}
    if not d.get("patient_id") or not d.get("medicine_details"):
        return jsonify({"error": "patient_id and medicine_details are required"}), 400

    user_id = get_jwt_identity()
    iid = query("""
        INSERT INTO patient_indents (patient_id, medicine_details, requested_by)
        VALUES (%s,%s,%s)
    """, (d["patient_id"], d["medicine_details"], user_id), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "Patient Indent", iid)
    return jsonify(query("SELECT * FROM patient_indents WHERE id=%s", (iid,))), 201


@patient_indents_bp.route("", methods=["GET"])
@jwt_required()
def list_indents():
    search = request.args.get("search", "")
    like = f"%{search}%"
    rows = query("""
        SELECT pi.id, p.patient_uid AS mr_number, p.name AS patient_name, p.reg_no AS patient_reg_no,
               pi.medicine_details, pi.requested_date, u.name AS requested_by_name, pi.status
        FROM patient_indents pi
        JOIN patients p ON p.id = pi.patient_id
        LEFT JOIN users u ON u.id = pi.requested_by
        WHERE p.name LIKE %s OR p.patient_uid LIKE %s OR pi.medicine_details LIKE %s
        ORDER BY pi.id DESC
    """, (like, like, like), many=True)
    return jsonify(rows)


@patient_indents_bp.route("/<int:indent_id>/status", methods=["PATCH"])
@jwt_required()
def update_status(indent_id):
    d = request.get_json(silent=True) or {}
    status = d.get("status")
    if status not in ("Pending", "Fulfilled", "Cancelled"):
        return jsonify({"error": "invalid status"}), 400

    row = query("SELECT id FROM patient_indents WHERE id=%s", (indent_id,))
    if not row:
        return jsonify({"error": "Indent not found"}), 404

    query("UPDATE patient_indents SET status=%s WHERE id=%s", (status, indent_id), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "STATUS_CHANGE", "Patient Indent", indent_id, status)
    return jsonify(query("SELECT * FROM patient_indents WHERE id=%s", (indent_id,)))