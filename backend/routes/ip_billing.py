from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import query
from utils import next_code, log_audit

ip_billing_bp = Blueprint("ip_billing", __name__)

CHARGE_FIELDS = [
    "admission_charge", "room_charge", "doctor_visit_charge", "lab_charge",
    "radiology_charge", "ot_charge", "procedure_charge", "medicine_charge",
    "nursing_charge", "service_charge", "food_charge", "misc_charge",
]


@ip_billing_bp.route("", methods=["POST"])
@jwt_required()
def create_bill():
    d = request.get_json() or {}

    admission_id = d.get("admission_id")          # legacy path, still supported
    ip_registration_id = d.get("ip_registration_id")  # new path

    if not admission_id and not ip_registration_id:
        return jsonify({"error": "ip_registration_id (or admission_id) is required"}), 400

    room_charge = float(d.get("room_charge", 0) or 0)

    # auto room-charge calculation only applies to the legacy admissions/rooms path
    if d.get("auto_room_charge") and admission_id:
        adm = query("""
            SELECT a.admission_date, r.rate_per_day FROM admissions a
            LEFT JOIN rooms r ON r.id = a.room_id WHERE a.id=%s
        """, (admission_id,))
        if adm and adm.get("rate_per_day") is not None:
            days = int(d.get("days", 1))
            room_charge = float(adm["rate_per_day"]) * days

    gross = room_charge
    for field in CHARGE_FIELDS:
        if field == "room_charge":
            continue
        gross += float(d.get(field, 0) or 0)
    gross = round(gross, 2)

    discount = float(d.get("discount", 0) or 0)
    grand_total = round(max(0, gross - discount), 2)

    advance_adjusted = float(d.get("advance_adjusted", 0) or 0)
    paid = float(d.get("paid_amount", 0) or 0)
    due = round(max(0, grand_total - advance_adjusted - paid), 2)

    total_paid = advance_adjusted + paid
    status = "Paid" if due <= 0 else ("Partial" if total_paid > 0 else "Draft")

    bill_no = next_code("IPB", "ip_bills", "bill_no")
    user_id = get_jwt_identity()

    values = [bill_no, admission_id, ip_registration_id]
    for field in CHARGE_FIELDS:
        values.append(room_charge if field == "room_charge" else d.get(field, 0))
    values += [gross, discount, grand_total, advance_adjusted, paid, due, status, user_id]

    bid = query(f"""
        INSERT INTO ip_bills (
            bill_no, admission_id, ip_registration_id, {', '.join(CHARGE_FIELDS)},
            gross_total, discount, grand_total, advance_adjusted, paid_amount, due_amount,
            status, created_by
        ) VALUES ({', '.join(['%s'] * len(values))})
    """, tuple(values), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "IP Billing", bid)
    return jsonify(query("SELECT * FROM ip_bills WHERE id=%s", (bid,))), 201


@ip_billing_bp.route("", methods=["GET"])
@jwt_required()
def list_bills():
    admission_id = request.args.get("admission_id")
    ip_registration_id = request.args.get("ip_registration_id")

    sql = """
        SELECT b.*,
               COALESCE(p_new.name, p_old.name) AS patient_name,
               COALESCE(r.ip_reg_no, a.admission_no) AS admission_no
        FROM ip_bills b
        LEFT JOIN admissions a ON a.id = b.admission_id
        LEFT JOIN patients p_old ON p_old.id = a.patient_id
        LEFT JOIN ip_registrations r ON r.id = b.ip_registration_id
        LEFT JOIN patients p_new ON p_new.id = r.patient_id
        WHERE 1=1
    """
    params = []
    if admission_id:
        sql += " AND b.admission_id=%s"
        params.append(admission_id)
    if ip_registration_id:
        sql += " AND b.ip_registration_id=%s"
        params.append(ip_registration_id)
    sql += " ORDER BY b.id DESC"

    return jsonify(query(sql, tuple(params), many=True))