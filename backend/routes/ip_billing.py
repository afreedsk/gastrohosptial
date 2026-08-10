from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import query
from utils import next_code, log_audit


ip_billing_bp = Blueprint("ip_billing", __name__)


# ============================================================
# CHARGE FIELDS
# ============================================================

CHARGE_FIELDS = [
    "admission_charge",
    "room_charge",
    "doctor_visit_charge",
    "lab_charge",
    "radiology_charge",
    "ot_charge",
    "procedure_charge",
    "medicine_charge",
    "nursing_charge",
    "service_charge",
    "food_charge",
    "misc_charge",
]


# ============================================================
# CREATE IP BILL
# ============================================================

@ip_billing_bp.route("", methods=["POST"])
@jwt_required()
def create_bill():

    d = request.get_json() or {}


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not d.get("admission_id"):
        return jsonify({
            "error": "admission_id is required"
        }), 400


    # --------------------------------------------------------
    # ROOM CHARGE
    # --------------------------------------------------------

    room_charge = float(
        d.get("room_charge", 0) or 0
    )


    # Automatically calculate room charge if requested

    if d.get("auto_room_charge"):

        adm = query(
            """
            SELECT
                a.admission_date,
                r.rate_per_day

            FROM admissions a

            LEFT JOIN rooms r
                ON r.id = a.room_id

            WHERE a.id=%s
            """,
            (d["admission_id"],)
        )


        if (
            adm
            and adm.get("rate_per_day") is not None
        ):

            days = int(
                d.get("days", 1)
            )

            room_charge = (
                float(adm["rate_per_day"])
                * days
            )


    # --------------------------------------------------------
    # GROSS TOTAL
    # --------------------------------------------------------

    gross = room_charge

    for field in CHARGE_FIELDS:

        if field == "room_charge":
            continue

        gross += float(
            d.get(field, 0) or 0
        )


    gross = round(
        gross,
        2
    )


    # --------------------------------------------------------
    # DISCOUNT
    # --------------------------------------------------------

    discount = float(
        d.get("discount", 0) or 0
    )


    # Prevent negative amount

    grand_total = round(
        max(0, gross - discount),
        2
    )


    # --------------------------------------------------------
    # ADVANCE
    # --------------------------------------------------------

    advance_adjusted = float(
        d.get("advance_adjusted", 0) or 0
    )


    # --------------------------------------------------------
    # PAID
    # --------------------------------------------------------

    paid = float(
        d.get("paid_amount", 0) or 0
    )


    # --------------------------------------------------------
    # DUE
    # --------------------------------------------------------

    due = round(
        max(
            0,
            grand_total
            - advance_adjusted
            - paid
        ),
        2
    )


    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    total_paid = (
        advance_adjusted + paid
    )


    status = (
        "Paid"
        if due <= 0
        else (
            "Partial"
            if total_paid > 0
            else "Draft"
        )
    )


    # --------------------------------------------------------
    # BILL NUMBER
    # --------------------------------------------------------

    bill_no = next_code(
        "IPB",
        "ip_bills",
        "bill_no"
    )


    user_id = get_jwt_identity()


    # --------------------------------------------------------
    # BUILD INSERT VALUES
    # --------------------------------------------------------

    values = [
        bill_no,
        d["admission_id"],
    ]


    for field in CHARGE_FIELDS:

        if field == "room_charge":

            values.append(
                room_charge
            )

        else:

            values.append(
                d.get(field, 0)
            )


    values += [
        gross,
        discount,
        grand_total,
        advance_adjusted,
        paid,
        due,
        status,
        user_id,
    ]


    # --------------------------------------------------------
    # INSERT BILL
    # --------------------------------------------------------

    bid = query(
        f"""
        INSERT INTO ip_bills (
            bill_no,
            admission_id,
            {', '.join(CHARGE_FIELDS)},

            gross_total,
            discount,
            grand_total,
            advance_adjusted,
            paid_amount,
            due_amount,
            status,
            created_by
        )

        VALUES (
            {', '.join(['%s'] * len(values))}
        )
        """,
        tuple(values),
        fetch=False,
        commit=True
    )


    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    log_audit(
        user_id,
        "CREATE",
        "IP Billing",
        bid
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify(
        query(
            "SELECT * FROM ip_bills WHERE id=%s",
            (bid,)
        )
    ), 201


# ============================================================
# LIST IP BILLS
# ============================================================

@ip_billing_bp.route("", methods=["GET"])
@jwt_required()
def list_bills():

    admission_id = request.args.get(
        "admission_id"
    )


    sql = """
        SELECT
            b.*,
            p.name AS patient_name,
            a.admission_no

        FROM ip_bills b

        JOIN admissions a
            ON a.id = b.admission_id

        JOIN patients p
            ON p.id = a.patient_id

        WHERE 1=1
    """


    params = []


    if admission_id:

        sql += """
            AND b.admission_id=%s
        """

        params.append(
            admission_id
        )


    sql += """
        ORDER BY b.id DESC
    """


    return jsonify(
        query(
            sql,
            tuple(params),
            many=True
        )
    )