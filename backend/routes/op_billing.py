from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import query
from utils import next_code, log_audit


op_billing_bp = Blueprint("op_billing", __name__)


def get_pagination_params():
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(request.args.get("per_page", 25))
    except (TypeError, ValueError):
        per_page = 25
    per_page = min(max(per_page, 1), 100)  # cap to avoid abuse
    offset = (page - 1) * per_page
    return page, per_page, offset


# ============================================================
# CREATE OP BILL
# ============================================================

@op_billing_bp.route("", methods=["POST"])
@jwt_required()
def create_bill():
    d = request.get_json() or {}

    if not d.get("patient_id"):
        return jsonify({"error": "patient_id is required"}), 400

    charges = [
        "consultation_charge", "lab_charge", "procedure_charge",
        "service_charge", "pharmacy_charge",
    ]
    gross = sum(float(d.get(charge, 0) or 0) for charge in charges)
    discount = float(d.get("discount", 0) or 0)
    taxable = max(0, gross - discount)
    net_total = round(taxable, 2)
    paid = float(d.get("paid_amount", 0) or 0)
    due = round(max(0, net_total - paid), 2)
    status = "Paid" if due <= 0 else ("Partial" if paid > 0 else "Due")
    bill_no = next_code("OPB", "op_bills", "bill_no")
    user_id = get_jwt_identity()

    bid = query(
        """
        INSERT INTO op_bills (
            bill_no, patient_id, appointment_id,
            consultation_charge, lab_charge, procedure_charge, service_charge, pharmacy_charge,
            gross_total, discount, net_total,
            paid_amount, due_amount, payment_mode, status, created_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            bill_no, d["patient_id"], d.get("appointment_id"),
            d.get("consultation_charge", 0), d.get("lab_charge", 0),
            d.get("procedure_charge", 0), d.get("service_charge", 0),
            d.get("pharmacy_charge", 0),
            gross, discount, net_total,
            paid, due, d.get("payment_mode", "Cash"), status, user_id,
        ),
        fetch=False, commit=True
    )

    log_audit(user_id, "CREATE", "OP Billing", bid)

    return jsonify(query("SELECT * FROM op_bills WHERE id=%s", (bid,))), 201


# ============================================================
# LIST OP BILLS  (search + date filter + pagination)
# ============================================================

@op_billing_bp.route("", methods=["GET"])
@jwt_required()
def list_bills():
    search = request.args.get("search", "").strip()
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    patient_id = request.args.get("patient_id")
    page, per_page, offset = get_pagination_params()

    base_from = """
        FROM op_bills b
        JOIN patients p ON p.id = b.patient_id
        LEFT JOIN (
            SELECT patient_id, MAX(opd_reg_no) AS opd_reg_no
            FROM op_registrations
            GROUP BY patient_id
        ) r ON r.patient_id = p.id
        WHERE 1=1
    """
    params = []

    if patient_id:
        base_from += " AND b.patient_id = %s"
        params.append(patient_id)

    if search:
        base_from += """ AND (
            b.bill_no LIKE %s OR p.name LIKE %s OR p.phone LIKE %s
            OR p.patient_uid LIKE %s OR r.opd_reg_no LIKE %s
        )"""
        like = f"%{search}%"
        params.extend([like, like, like, like, like])

    if start_date:
        base_from += " AND DATE(b.created_at) >= %s"
        params.append(start_date)
    if end_date:
        base_from += " AND DATE(b.created_at) <= %s"
        params.append(end_date)

    count_row = query(f"SELECT COUNT(*) AS total {base_from}", tuple(params), many=False)
    total = count_row["total"] if count_row else 0

    data_sql = f"""
        SELECT b.*, p.name AS patient_name, p.phone AS patient_phone,
               p.patient_uid, r.opd_reg_no
        {base_from}
        ORDER BY b.id DESC
        LIMIT %s OFFSET %s
    """
    rows = query(data_sql, tuple(params + [per_page, offset]), many=True)

    return jsonify({
        "data": rows or [],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    })


# ============================================================
# GET SINGLE OP BILL
# ============================================================

@op_billing_bp.route("/<int:bid>", methods=["GET"])
@jwt_required()
def get_bill(bid):
    bill = query("SELECT * FROM op_bills WHERE id=%s", (bid,))
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(bill)