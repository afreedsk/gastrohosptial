from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit

advance_payments_bp = Blueprint("advance_payments", __name__)


def total_advance_for(reg_id):
    reg = query("SELECT advance_amount FROM ip_registrations WHERE id=%s", (reg_id,))
    base = float(reg["advance_amount"] or 0) if reg else 0
    paid = query("SELECT IFNULL(SUM(amount),0) s FROM advance_payments WHERE ip_registration_id=%s AND entry_type='Payment'", (reg_id,))["s"]
    refunded = query("SELECT IFNULL(SUM(amount),0) s FROM advance_payments WHERE ip_registration_id=%s AND entry_type='Refund'", (reg_id,))["s"]
    return base + float(paid) - float(refunded)


@advance_payments_bp.route("/patients", methods=["GET"])
@jwt_required()
def list_patients():
    """List view for the Advance Payment page: MR Number, Patient Reg No,
    Name, Contact, Gender, Floor/Room Type/Room No/Bed No."""
    search = request.args.get("search", "")
    like = f"%{search}%"
    rows = query("""
        SELECT r.id, p.patient_uid AS mr_number, r.ip_reg_no AS patient_reg_no,
               CONCAT(r.first_name,' ',IFNULL(r.last_name,'')) AS name,
               r.mobile AS contact, r.gender, r.floor, r.room_type, r.room_no, r.bed_no
        FROM ip_registrations r
        JOIN patients p ON p.id = r.patient_id
        WHERE r.status='Admitted' AND (
            r.first_name LIKE %s OR r.mobile LIKE %s OR p.patient_uid LIKE %s OR r.ip_reg_no LIKE %s
        )
        ORDER BY r.id DESC
    """, (like, like, like, like), many=True)
    return jsonify(rows)


@advance_payments_bp.route("/patients-detail", methods=["GET"])
@jwt_required()
def list_patients_detail():
    """Richer list for IPDetails.jsx, matching the Inpatient Dashboard view."""
    search = request.args.get("search", "")
    like = f"%{search}%"
    rows = query("""
        SELECT r.id, p.patient_uid AS mr_number, r.ip_reg_no AS patient_reg_no,
               r.opd_reg_no, CONCAT(r.first_name,' ',IFNULL(r.last_name,'')) AS name,
               r.mobile AS phone, r.gender, r.age, doc.name AS doctor_name,
               r.referral_type, r.room_type, r.room_no, r.bed_no,
               r.admitted_date, r.advance_amount, r.payment_mode
        FROM ip_registrations r
        JOIN patients p ON p.id = r.patient_id
        LEFT JOIN doctors doc ON doc.id = r.doctor_id
        WHERE r.status='Admitted' AND (
            r.first_name LIKE %s OR r.mobile LIKE %s OR p.patient_uid LIKE %s OR r.ip_reg_no LIKE %s
        )
        ORDER BY r.id DESC
    """, (like, like, like, like), many=True)

    for row in rows:
        row["advance_amount"] = total_advance_for(row["id"])

    return jsonify({"count": len(rows), "results": rows})


@advance_payments_bp.route("/<int:reg_id>", methods=["GET"])
@jwt_required()
def get_ledger(reg_id):
    patient = query("""
        SELECT r.id, r.ip_reg_no AS patient_reg_no,
               CONCAT(r.first_name,' ',IFNULL(r.last_name,'')) AS name,
               CONCAT(r.room_type,'/',IFNULL(r.room_no,'—'),'/',IFNULL(r.bed_no,'—')) AS room
        FROM ip_registrations r WHERE r.id=%s
    """, (reg_id,))
    if not patient:
        return jsonify({"error": "Admission not found"}), 404

    entries = query("""
        SELECT ap.id, ap.entry_type, ap.amount, ap.payment_mode, ap.remarks, ap.created_at,
               u.name AS received_by_name
        FROM advance_payments ap
        LEFT JOIN users u ON u.id = ap.received_by
        WHERE ap.ip_registration_id=%s
        ORDER BY ap.id DESC
    """, (reg_id,), many=True)

    rows = []
    for e in entries:
        amount_paid = float(e["amount"]) if e["entry_type"] == "Payment" else 0
        refund_paid = float(e["amount"]) if e["entry_type"] == "Refund" else 0
        rows.append({
            "id": e["id"],
            "patient_reg_no": patient["patient_reg_no"],
            "amount_paid": amount_paid,
            "refund_paid": refund_paid,
            "total": amount_paid - refund_paid,
            "received_at": e["created_at"],
            "received_by": e["received_by_name"] or "—",
            "remarks": e["remarks"],
            "payment_mode": e["payment_mode"],
        })

    amount_paid_total = sum(r["amount_paid"] for r in rows)
    net_total = sum(r["total"] for r in rows)

    return jsonify({
        "patient": patient,
        "entries": rows,
        "amount_paid_total": amount_paid_total,
        "net_total": net_total,
    })


@advance_payments_bp.route("", methods=["POST"])
@jwt_required()
def create_entry():
    d = request.get_json(silent=True) or {}
    reg_id = d.get("ip_registration_id")
    entry_type = d.get("entry_type")  # 'Payment' | 'Refund'
    amount = d.get("amount")

    if not reg_id or entry_type not in ("Payment", "Refund") or not amount:
        return jsonify({"error": "ip_registration_id, entry_type, and amount are required"}), 400

    reg = query("SELECT id FROM ip_registrations WHERE id=%s", (reg_id,))
    if not reg:
        return jsonify({"error": "Admission not found"}), 404

    user_id = get_jwt_identity()
    eid = query("""
        INSERT INTO advance_payments (ip_registration_id, entry_type, amount, payment_mode, remarks, received_by)
        VALUES (%s,%s,%s,%s,%s,%s)
    """, (reg_id, entry_type, amount, d.get("payment_mode", "Cash"), d.get("remarks"), user_id),
    fetch=False, commit=True)

    log_audit(user_id, f"ADVANCE_{entry_type.upper()}", "IP Advance Payment", reg_id, d.get("remarks"))
    return jsonify(query("SELECT * FROM advance_payments WHERE id=%s", (eid,))), 201