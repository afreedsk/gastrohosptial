from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    registrations = query("SELECT COUNT(*) c FROM patients WHERE DATE(created_at)=CURDATE()")["c"]
    appointments = query("SELECT COUNT(*) c FROM appointments WHERE appointment_date=CURDATE()")["c"]
    op_patients = query("SELECT COUNT(DISTINCT patient_id) c FROM op_bills WHERE DATE(created_at)=CURDATE()")["c"]
    ip_admissions = query("SELECT COUNT(*) c FROM admissions WHERE admission_date=CURDATE()")["c"]
    pending_bills = query("SELECT COUNT(*) c FROM op_bills WHERE status IN ('Due','Partial')")["c"] + \
        query("SELECT COUNT(*) c FROM ip_bills WHERE status IN ('Due','Partial','Draft')")["c"]
    revenue = (query("SELECT IFNULL(SUM(paid_amount),0) s FROM op_bills WHERE DATE(created_at)=CURDATE()")["s"] or 0) + \
        (query("SELECT IFNULL(SUM(paid_amount),0) s FROM ip_bills WHERE DATE(created_at)=CURDATE()")["s"] or 0)
    cancelled_bills = query("SELECT COUNT(*) c FROM op_bills WHERE status='Cancelled' AND DATE(created_at)=CURDATE()")["c"] + \
        query("SELECT COUNT(*) c FROM ip_bills WHERE status='Cancelled' AND DATE(created_at)=CURDATE()")["c"]
    pending_labs = query("SELECT COUNT(*) c FROM lab_tests WHERE status='Pending'")["c"]

    return jsonify({
        "todays_registrations": registrations,
        "todays_appointments": appointments,
        "todays_op_patients": op_patients,
        "todays_ip_admissions": ip_admissions,
        "pending_bills": pending_bills,
        "todays_revenue": float(revenue),
        "cancelled_bills": cancelled_bills,
        "pending_lab_reports": pending_labs,
    })


@dashboard_bp.route("/charts/patients-per-day", methods=["GET"])
@jwt_required()
def patients_per_day():
    rows = query("""
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM patients
        WHERE created_at >= CURDATE() - INTERVAL 6 DAY
        GROUP BY DATE(created_at) ORDER BY day
    """, many=True)
    return jsonify(rows)


@dashboard_bp.route("/charts/revenue", methods=["GET"])
@jwt_required()
def revenue_chart():
    rows = query("""
        SELECT d.day, IFNULL(op.total,0) + IFNULL(ip.total,0) AS revenue FROM (
            SELECT CURDATE() - INTERVAL n DAY AS day
            FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
                  UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) days
        ) d
        LEFT JOIN (SELECT DATE(created_at) day, SUM(paid_amount) total FROM op_bills GROUP BY DATE(created_at)) op
            ON op.day = d.day
        LEFT JOIN (SELECT DATE(created_at) day, SUM(paid_amount) total FROM ip_bills GROUP BY DATE(created_at)) ip
            ON ip.day = d.day
        ORDER BY d.day
    """, many=True)
    return jsonify(rows)


@dashboard_bp.route("/charts/op-vs-ip", methods=["GET"])
@jwt_required()
def op_vs_ip():
    op = query("SELECT COUNT(*) c FROM op_bills WHERE DATE(created_at) >= CURDATE() - INTERVAL 6 DAY")["c"]
    ip = query("SELECT COUNT(*) c FROM ip_bills WHERE DATE(created_at) >= CURDATE() - INTERVAL 6 DAY")["c"]
    return jsonify([{"name": "OP", "value": op}, {"name": "IP", "value": ip}])


@dashboard_bp.route("/charts/department-collection", methods=["GET"])
@jwt_required()
def department_collection():
    rows = query("""
        SELECT dep.name AS department, IFNULL(SUM(a.consultation_fee),0) AS collection
        FROM departments dep
        LEFT JOIN appointments a ON a.department_id = dep.id AND a.status='Completed'
        GROUP BY dep.id
    """, many=True)
    return jsonify(rows)


def _empty_bucket():
    return {"cash": 0.0, "card": 0.0, "upi": 0.0, "bank": 0.0, "total": 0.0}


def _mode_key(mode):
    if mode == "Cash":
        return "cash"
    if mode == "Card":
        return "card"
    if mode == "UPI":
        return "upi"
    return "bank"  # NEFT, Cheque, Credit, Insurance all fall under "bank"


def _add(bucket, mode, amount):
    if not amount:
        return
    k = _mode_key(mode)
    bucket[k] += float(amount)
    bucket["total"] += float(amount)


@dashboard_bp.route("/collection-summary", methods=["GET"])
@jwt_required()
def collection_summary():
    start_date = request.args.get("start_date") or date.today().isoformat()
    end_date = request.args.get("end_date") or date.today().isoformat()
    # "clinic" accepted for forward compatibility; no multi-clinic data model yet, so unused
    request.args.get("clinic", "All")

    op_billing = _empty_bucket()
    op_diagnostics = _empty_bucket()
    op_radiology = _empty_bucket()
    direct_patients = _empty_bucket()
    direct_diagnostics = _empty_bucket()
    direct_radiology = _empty_bucket()

    op_due_direct = 0.0
    op_due_lab_radiology = 0.0

    op_bills = query("""
        SELECT * FROM op_bills
        WHERE DATE(created_at) BETWEEN %s AND %s AND status != 'Cancelled'
    """, (start_date, end_date), many=True)

    for b in op_bills:
        paid = float(b["paid_amount"] or 0)
        due = float(b["due_amount"] or 0)
        is_direct = b["appointment_id"] is None
        mode = b["payment_mode"]

        consult = float(b["consultation_charge"] or 0)
        lab = float(b["lab_charge"] or 0)
        proc = float(b["procedure_charge"] or 0)  # treated as radiology proxy
        other = float(b["service_charge"] or 0) + float(b["pharmacy_charge"] or 0)

        parts = {"consult": consult + other, "lab": lab, "proc": proc}
        total_parts = sum(parts.values()) or 1

        for key, amt in parts.items():
            frac = amt / total_parts
            share_paid = paid * frac
            share_due = due * frac

            if key == "consult":
                _add(direct_patients if is_direct else op_billing, mode, share_paid)
                op_due_direct += share_due
            elif key == "lab":
                _add(direct_diagnostics if is_direct else op_diagnostics, mode, share_paid)
                op_due_lab_radiology += share_due
            elif key == "proc":
                _add(direct_radiology if is_direct else op_radiology, mode, share_paid)
                op_due_lab_radiology += share_due

    ip_income = _empty_bucket()
    ip_diagnostics = _empty_bucket()
    ip_radiology = _empty_bucket()
    ip_due_bill = 0.0
    ip_due_lab_radiology = 0.0

    ip_bills = query("""
        SELECT * FROM ip_bills
        WHERE DATE(created_at) BETWEEN %s AND %s AND status != 'Cancelled'
    """, (start_date, end_date), many=True)

    for b in ip_bills:
        paid = float(b["paid_amount"] or 0)
        due = float(b["due_amount"] or 0)
        lab = float(b["lab_charge"] or 0)
        radiology = float(b["radiology_charge"] or 0)
        other = (
            float(b["admission_charge"] or 0) + float(b["room_charge"] or 0) +
            float(b["doctor_visit_charge"] or 0) + float(b["ot_charge"] or 0) +
            float(b["procedure_charge"] or 0) + float(b["medicine_charge"] or 0) +
            float(b["nursing_charge"] or 0) + float(b["service_charge"] or 0) +
            float(b["food_charge"] or 0) + float(b["misc_charge"] or 0)
        )
        # ip_bills has no payment_mode column in the current schema — bucketed as Cash
        # until that column is added.
        mode = "Cash"

        parts = {"other": other, "lab": lab, "radiology": radiology}
        total_parts = sum(parts.values()) or 1

        for key, amt in parts.items():
            frac = amt / total_parts
            share_paid = paid * frac
            share_due = due * frac
            if key == "other":
                _add(ip_income, mode, share_paid)
                ip_due_bill += share_due
            elif key == "lab":
                _add(ip_diagnostics, mode, share_paid)
                ip_due_lab_radiology += share_due
            elif key == "radiology":
                _add(ip_radiology, mode, share_paid)
                ip_due_lab_radiology += share_due

    refunds = query("""
        SELECT bill_type, IFNULL(SUM(amount),0) s FROM billing_actions
        WHERE action_type='Advance_Refund' AND DATE(created_at) BETWEEN %s AND %s
        GROUP BY bill_type
    """, (start_date, end_date), many=True)
    refund_map = {r["bill_type"]: float(r["s"]) for r in refunds}

    total_income = (
        op_billing["total"] + op_diagnostics["total"] + op_radiology["total"] +
        direct_patients["total"] + direct_diagnostics["total"] + direct_radiology["total"] +
        ip_income["total"] + ip_diagnostics["total"] + ip_radiology["total"]
    )
    expenses = 0.0  # no expense-tracking table exists yet
    grand_total = total_income - expenses

    users_count = query("SELECT COUNT(*) c FROM users WHERE is_active=1")["c"]
    doctors_count = query("SELECT COUNT(*) c FROM doctors")["c"]

    return jsonify({
        "range": {"start_date": start_date, "end_date": end_date},
        "meta": {
            "users": users_count,
            "doctors": doctors_count,
            "last_updated": datetime.now().isoformat(),
            "sms_remaining": None,  # no SMS provider integrated
        },
        "op_billing": op_billing,
        "op_diagnostics": op_diagnostics,
        "op_radiology": op_radiology,
        "op_refund": refund_map.get("OP", 0.0),
        "direct_patients": direct_patients,
        "direct_diagnostics": direct_diagnostics,
        "direct_radiology": direct_radiology,
        "ip_income": ip_income,
        "ip_diagnostics": ip_diagnostics,
        "ip_radiology": ip_radiology,
        "ip_refund": refund_map.get("IP", 0.0),
        "total_income": total_income,
        "expenses": expenses,
        "grand_total": grand_total,
        "due": {
            "op_direct_bill_due": op_due_direct,
            "op_lab_radiology_due": op_due_lab_radiology,
            "ip_bill_due": ip_due_bill,
            "ip_lab_radiology_due": ip_due_lab_radiology,
            "total_due": op_due_direct + op_due_lab_radiology + ip_due_bill + ip_due_lab_radiology,
        },
    })