from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import query
from utils import next_code, log_audit


op_billing_bp = Blueprint("op_billing", __name__)


# ============================================================
# CREATE OP BILL
# ============================================================

@op_billing_bp.route("", methods=["POST"])
@jwt_required()
def create_bill():

    d = request.get_json() or {}

    if not d.get("patient_id"):
        return jsonify({
            "error": "patient_id is required"
        }), 400


    # --------------------------------------------------------
    # CHARGES
    # --------------------------------------------------------

    charges = [
        "consultation_charge",
        "lab_charge",
        "procedure_charge",
        "service_charge",
        "pharmacy_charge",
    ]


    gross = sum(
        float(d.get(charge, 0) or 0)
        for charge in charges
    )


    # --------------------------------------------------------
    # DISCOUNT
    # --------------------------------------------------------

    discount = float(
        d.get("discount", 0) or 0
    )


    # Prevent negative total after discount

    taxable = max(
        0,
        gross - discount
    )


    # --------------------------------------------------------
    # NO GST / TAX
    # --------------------------------------------------------

    net_total = round(
        taxable,
        2
    )


    # --------------------------------------------------------
    # PAYMENT
    # --------------------------------------------------------

    paid = float(
        d.get("paid_amount", 0) or 0
    )


    due = round(
        max(0, net_total - paid),
        2
    )


    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    status = (
        "Paid"
        if due <= 0
        else (
            "Partial"
            if paid > 0
            else "Due"
        )
    )


    # --------------------------------------------------------
    # BILL NUMBER
    # --------------------------------------------------------

    bill_no = next_code(
        "OPB",
        "op_bills",
        "bill_no"
    )


    user_id = get_jwt_identity()


    # --------------------------------------------------------
    # INSERT
    # --------------------------------------------------------

    bid = query(
        """
        INSERT INTO op_bills (
            bill_no,
            patient_id,
            appointment_id,

            consultation_charge,
            lab_charge,
            procedure_charge,
            service_charge,
            pharmacy_charge,

            gross_total,
            discount,
            net_total,

            paid_amount,
            due_amount,
            payment_mode,
            status,
            created_by
        )
        VALUES (
            %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s, %s
        )
        """,
        (
            bill_no,
            d["patient_id"],
            d.get("appointment_id"),

            d.get("consultation_charge", 0),
            d.get("lab_charge", 0),
            d.get("procedure_charge", 0),
            d.get("service_charge", 0),
            d.get("pharmacy_charge", 0),

            gross,
            discount,
            net_total,

            paid,
            due,
            d.get("payment_mode", "Cash"),
            status,
            user_id,
        ),
        fetch=False,
        commit=True
    )


    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    log_audit(
        user_id,
        "CREATE",
        "OP Billing",
        bid
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify(
        query(
            "SELECT * FROM op_bills WHERE id=%s",
            (bid,)
        )
    ), 201


# ============================================================
# LIST OP BILLS
# ============================================================

@op_billing_bp.route("", methods=["GET"])
@jwt_required()
def list_bills():

    patient_id = request.args.get(
        "patient_id"
    )


    sql = """
        SELECT
            b.*,
            p.name AS patient_name

        FROM op_bills b

        JOIN patients p
            ON p.id = b.patient_id

        WHERE 1=1
    """


    params = []


    if patient_id:

        sql += """
            AND b.patient_id=%s
        """

        params.append(
            patient_id
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


# ============================================================
# GET SINGLE OP BILL
# ============================================================

@op_billing_bp.route("/<int:bid>", methods=["GET"])
@jwt_required()
def get_bill(bid):

    bill = query(
        "SELECT * FROM op_bills WHERE id=%s",
        (bid,)
    )


    if not bill:

        return jsonify({
            "error": "Bill not found"
        }), 404


    return jsonify(bill)