from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import next_code, log_audit

ip_billing_bp = Blueprint("ip_billing", __name__)

CHARGE_FIELDS = [
    "admission_charge", "room_charge", "doctor_visit_charge", "lab_charge",
    "radiology_charge", "ot_charge", "procedure_charge", "medicine_charge",
    "nursing_charge", "service_charge", "food_charge", "misc_charge"
]


@ip_billing_bp.route("", methods=["POST"])
@jwt_required()
def create_bill():
    d = request.get_json()
    if not d.get("admission_id"):
        return jsonify({"error": "admission_id is required"}), 400

    # auto-calc room charge from days * rate, if requested
    room_charge = float(d.get("room_charge", 0) or 0)
    if d.get("auto_room_charge"):
        adm = query("""SELECT a.admission_date, r.rate_per_day FROM admissions a
                        LEFT JOIN rooms r ON r.id=a.room_id WHERE a.id=%s""", (d["admission_id"],))
        if adm and adm["rate_per_day"]:
            days = int(d.get("days", 1))
            room_charge = float(adm["rate_per_day"]) * days

    gross = room_charge + sum(float(d.get(f, 0) or 0) for f in CHARGE_FIELDS if f != "room_charge")
    discount = float(d.get("discount", 0) or 0)
    tax_percent = float(d.get("tax_percent", 0) or 0)
    taxable = gross - discount
    tax = round(taxable * tax_percent / 100, 2)
    grand_total = round(taxable + tax, 2)
    advance_adjusted = float(d.get("advance_adjusted", 0) or 0)
    paid = float(d.get("paid_amount", 0) or 0)
    due = round(grand_total - advance_adjusted - paid, 2)
    status = "Paid" if due <= 0 else ("Partial" if (paid + advance_adjusted) > 0 else "Draft")

    bill_no = next_code("IPB", "ip_bills", "bill_no")
    user_id = get_jwt_identity()

    values = [bill_no, d["admission_id"]]
    for f in CHARGE_FIELDS:
        values.append(room_charge if f == "room_charge" else d.get(f, 0))
    values += [gross, discount, tax, grand_total, advance_adjusted, paid, due, status, user_id]

    bid = query(f"""
        INSERT INTO ip_bills (
            bill_no, admission_id, {', '.join(CHARGE_FIELDS)},
            gross_total, discount, tax, grand_total, advance_adjusted, paid_amount, due_amount, status, created_by
        ) VALUES ({', '.join(['%s'] * len(values))})
    """, tuple(values), fetch=False, commit=True)

    log_audit(user_id, "CREATE", "IP Billing", bid)
    return jsonify(query("SELECT * FROM ip_bills WHERE id=%s", (bid,))), 201


@ip_billing_bp.route("", methods=["GET"])
@jwt_required()
def list_bills():
    admission_id = request.args.get("admission_id")
    sql = """SELECT b.*, p.name AS patient_name, a.admission_no FROM ip_bills b
              JOIN admissions a ON a.id=b.admission_id
              JOIN patients p ON p.id=a.patient_id WHERE 1=1"""
    params = []
    if admission_id:
        sql += " AND b.admission_id=%s"
        params.append(admission_id)
    sql += " ORDER BY b.id DESC"
    return jsonify(query(sql, tuple(params), many=True))
