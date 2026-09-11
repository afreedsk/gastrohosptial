from datetime import date, datetime
import json

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from db import query

dashboard_bp = Blueprint("dashboard", __name__)


# ---------------------------------------------------------------------------
# TOP SUMMARY
# ---------------------------------------------------------------------------
@dashboard_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    registrations = query(
        "SELECT COUNT(*) c FROM patients WHERE DATE(created_at)=CURDATE()"
    )["c"]
    appointments = query(
        "SELECT COUNT(*) c FROM appointments WHERE appointment_date=CURDATE()"
    )["c"]
    op_patients = query(
        "SELECT COUNT(DISTINCT patient_id) c FROM op_bills WHERE DATE(created_at)=CURDATE()"
    )["c"]
    ip_admissions = query(
        "SELECT COUNT(*) c FROM admissions WHERE admission_date=CURDATE()"
    )["c"]
    pending_bills = (
        query("SELECT COUNT(*) c FROM op_bills WHERE status IN ('Due','Partial')")["c"]
        + query(
            "SELECT COUNT(*) c FROM ip_bills WHERE status IN ('Due','Partial','Draft')"
        )["c"]
    )
    revenue = (
        query(
            "SELECT IFNULL(SUM(paid_amount),0) s FROM op_bills WHERE DATE(created_at)=CURDATE()"
        )["s"] or 0
    ) + (
        query(
            "SELECT IFNULL(SUM(paid_amount),0) s FROM ip_bills WHERE DATE(created_at)=CURDATE()"
        )["s"] or 0
    )
    cancelled_bills = (
        query(
            "SELECT COUNT(*) c FROM op_bills WHERE status='Cancelled' AND DATE(created_at)=CURDATE()"
        )["c"]
        + query(
            "SELECT COUNT(*) c FROM ip_bills WHERE status='Cancelled' AND DATE(created_at)=CURDATE()"
        )["c"]
    )
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


# ---------------------------------------------------------------------------
# CHARTS
# ---------------------------------------------------------------------------
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
        LEFT JOIN (SELECT DATE(created_at) day, SUM(paid_amount) total
                   FROM op_bills GROUP BY DATE(created_at)) op ON op.day = d.day
        LEFT JOIN (SELECT DATE(created_at) day, SUM(paid_amount) total
                   FROM ip_bills GROUP BY DATE(created_at)) ip ON ip.day = d.day
        ORDER BY d.day
    """, many=True)
    return jsonify(rows)


@dashboard_bp.route("/charts/op-vs-ip", methods=["GET"])
@jwt_required()
def op_vs_ip():
    op = query(
        "SELECT COUNT(*) c FROM op_bills WHERE DATE(created_at) >= CURDATE() - INTERVAL 6 DAY"
    )["c"]
    ip = query(
        "SELECT COUNT(*) c FROM ip_bills WHERE DATE(created_at) >= CURDATE() - INTERVAL 6 DAY"
    )["c"]
    return jsonify([{"name": "OP", "value": op}, {"name": "IP", "value": ip}])


@dashboard_bp.route("/charts/department-collection", methods=["GET"])
@jwt_required()
def department_collection():
    rows = query("""
        SELECT dep.name AS department, IFNULL(SUM(a.consultation_fee),0) AS collection
        FROM departments dep
        LEFT JOIN appointments a
               ON a.department_id = dep.id AND a.status='Completed'
        GROUP BY dep.id
    """, many=True)
    return jsonify(rows)


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def _empty_bucket():
    return {"cash": 0.0, "card": 0.0, "upi": 0.0, "bank": 0.0, "total": 0.0, "count": 0}


def _mode_key(mode):
    if not mode:
        return "cash"
    m = str(mode).strip().lower()
    if m == "cash":
        return "cash"
    if m == "card":
        return "card"
    if m == "upi":
        return "upi"
    return "bank"  # Bank, NEFT, Cheque, Credit, Insurance


def _add(bucket, mode, amount):
    try:
        amt = float(amount or 0)
    except (TypeError, ValueError):
        return
    if amt == 0:
        return
    bucket[_mode_key(mode)] += amt
    bucket["total"] += amt


def _parse_split(raw):
    if not raw:
        return None
    if isinstance(raw, dict):
        return {str(k): float(v or 0) for k, v in raw.items()}
    if isinstance(raw, (str, bytes, bytearray)):
        try:
            data = json.loads(raw)
        except Exception:
            return None
        if isinstance(data, dict):
            return {str(k): float(v or 0) for k, v in data.items()}
    return None


def _iter_paid_splits(paid_amount, single_mode, split_json):
    if paid_amount <= 0:
        return
    split = _parse_split(split_json)
    if split:
        total = sum(split.values())
        if total > 0:
            scale = paid_amount / total
            for mode, amt in split.items():
                if amt > 0:
                    yield mode, amt * scale
            return
    yield single_mode, paid_amount


def _distribute(paid_amount, single_mode, split_json, parts, bucket_map):
    """
    Splits paid_amount proportionally across parts (e.g. consult/lab/radiology)
    and credits the matching payment-mode buckets. Also marks bucket['count']
    += 1 for every category that had a non-zero part on this bill, so the UI
    can show a record count per category (e.g. "OP Billing - 6344"),
    independent of whether that part was actually paid yet.
    """
    for key, part_amt in parts.items():
        if part_amt:
            bucket = bucket_map.get(key)
            if bucket is not None:
                bucket["count"] += 1

    if paid_amount <= 0:
        return
    splits = list(_iter_paid_splits(paid_amount, single_mode, split_json))
    if not splits:
        return

    total_parts = sum(float(v or 0) for v in parts.values())

    if total_parts <= 0:
        for k in parts:
            bucket = bucket_map.get(k)
            if bucket is not None:
                for mode, amt in splits:
                    _add(bucket, mode, amt)
                return
        return

    for target_key, part_amt in parts.items():
        if not part_amt:
            continue
        bucket = bucket_map.get(target_key)
        if bucket is None:
            continue
        for mode, amt in splits:
            _add(bucket, mode, amt * (float(part_amt) / total_parts))


def _is_consultation_bill(bill_no, consult_charge, remarks):
    """
    True if this op_bills row represents a real doctor-consultation /
    registration charge — i.e. genuine evidence the patient actually saw a
    doctor that day, as opposed to a bulk-imported lab/radiology-only bill.

    Two signals, because neither is reliable alone on this dataset:
      1. consultation_charge > 0 — the "correct" signal, but many older
         consultation bills were imported with this column left at 0 and
         the amount recorded only in `remarks` (e.g. "Consultation Fee,
         Registration Fee" with gross_total=500, consultation_charge=0).
         A one-time backfill migration can set consultation_charge from
         gross_total for these, but this function must work correctly
         whether or not that migration has been run.
      2. remarks mentioning "Consultation" or "Registration" — catches the
         bills the backfill hasn't (yet) touched.

    Bulk-imported Lab/Radiology/IP-diagnostics bills (bill_no prefixes
    OPInv/OPRInv/IPDInv/IPRInv) are excluded up front: those bill numbers
    are never real consultation bills, and without this exclusion a lab
    bill whose Investigations text happened to contain the word
    "registration" could falsely count as a consultation.
    """
    bn = (bill_no or "").upper()
    if bn.startswith("OPR") or bn.startswith("IPD") or bn.startswith("IPR") or bn.startswith("OPINV"):
        return False
    if consult_charge and float(consult_charge) > 0:
        return True
    r = (remarks or "").lower()
    return "consultation" in r or "registration" in r


def _classify_op_bill(bill_no, appointment_id, consult_charge, lab, radiology, proc,
                       patient_id, bill_date, consult_days):
    """
    Return one of: 'op', 'direct', 'op_radiology', 'ip_diagnostics'

    Bulk-import bill numbering convention:
      - Radiology imports:  bill_no like 'OPRInv1021-...'
      - Lab imports:        bill_no like 'OPInv1021-...'
      - OPD consult imports: bill_no like 'INV3869'
      - IPD diagnostics (legacy, stored in op_bills):  bill_no like 'IPDInv...'

    IMPORTANT — why bill_no prefix ALONE cannot tell OP from Direct:
    every bulk-imported Lab/Radiology bill carries an OP-prefixed patient
    registration number (OP10210...), because the source hospital software
    auto-issues that registration number for ANY billing transaction —
    whether the patient saw a doctor first or walked straight up to the lab
    counter. So "has an OP registration number" does NOT mean "saw a
    doctor" in this data, and the bill_no prefix by itself cannot
    distinguish a true OP visit from a Direct walk-in-for-a-test-only visit.

    The signal that DOES distinguish them: whether that same patient also
    has a genuine consultation/registration bill on the SAME calendar day
    (see _is_consultation_bill and the `consult_days` set built once per
    request in collection_summary). If yes, the lab/radiology charge on
    that day belongs to a real OP visit. If no, it's Direct.

    Known limitation: this is a same-day heuristic, not a true per-visit
    join (op_bills has no direct link to a specific registration event), so
    a lab test billed a few minutes past midnight relative to that day's
    consultation bill could theoretically be missed. This is intentional
    given what the data supports — see the conversation history for the
    full column-by-column audit that ruled out other options.
    """
    bn = (bill_no or "").upper()

    if bn.startswith("IPD"):
        return "ip_diagnostics"

    if bn.startswith("OPR"):
        if (patient_id, bill_date) in consult_days:
            return "op_radiology"
        return "direct"

    if bn.startswith("OPINV"):
        if (patient_id, bill_date) in consult_days:
            return "op"
        return "direct"

    if bn.startswith("INV"):
        # OPD consultation bulk-import convention — always a real OP patient
        # (this bill number IS the consultation/registration charge itself).
        return "op"

    has_diag = (lab > 0) or (radiology > 0) or (proc > 0)
    if appointment_id is None and consult_charge == 0 and has_diag:
        return "direct"
    return "op"


# ---------------------------------------------------------------------------
# COLLECTION SUMMARY
# ---------------------------------------------------------------------------
@dashboard_bp.route("/collection-summary", methods=["GET"])
@jwt_required()
def collection_summary():
    start_date = request.args.get("start_date") or date.today().isoformat()
    end_date = request.args.get("end_date") or date.today().isoformat()
    request.args.get("clinic", "All")

    # All buckets
    op_billing = _empty_bucket()
    op_diagnostics = _empty_bucket()
    op_radiology = _empty_bucket()
    direct_patients = _empty_bucket()
    direct_diagnostics = _empty_bucket()
    direct_radiology = _empty_bucket()
    ip_income = _empty_bucket()
    ip_diagnostics = _empty_bucket()
    ip_radiology = _empty_bucket()

    op_due_direct = 0.0
    op_due_lab_radiology = 0.0
    ip_due_bill = 0.0
    ip_due_lab_radiology = 0.0

    # ----- OP bills --------------------------------------------------------
    op_bills = query("""
        SELECT id, bill_no, patient_id, appointment_id,
               consultation_charge, lab_charge, procedure_charge,
               service_charge, pharmacy_charge, radiology_charge,
               paid_amount, due_amount, payment_mode, payment_split,
               status, remarks, created_at
        FROM op_bills
        WHERE DATE(created_at) BETWEEN %s AND %s
          AND status <> 'Cancelled'
    """, (start_date, end_date), many=True)

    # ----- Pass 1: which (patient, day) pairs have a real consultation? ----
    # Built once, up front, so the classification pass below can do a same-
    # day lookup instead of a per-bill query. See _is_consultation_bill /
    # _classify_op_bill docstrings for why this is the signal that actually
    # distinguishes a true OP visit from a Direct walk-in-for-a-test-only
    # bill in this dataset.
    consult_days = set()
    for b in op_bills:
        created = b.get("created_at")
        if not created:
            continue
        day = created.date() if hasattr(created, "date") else created
        if _is_consultation_bill(b.get("bill_no"), b.get("consultation_charge"), b.get("remarks")):
            consult_days.add((b.get("patient_id"), day))

    # IPD* bills found in op_bills are deferred so we can route them into
    # the IP buckets (which are logically the correct home for them).
    deferred_ip_diag = []

    for b in op_bills:
        paid = float(b["paid_amount"] or 0)
        due = float(b["due_amount"] or 0)
        mode = b.get("payment_mode")
        split = b.get("payment_split")

        consult_charge = float(b["consultation_charge"] or 0)
        lab = float(b["lab_charge"] or 0)
        radiology = float(b.get("radiology_charge") or 0)
        proc = float(b["procedure_charge"] or 0)
        if radiology == 0 and proc > 0:
            radiology = proc
        other = float(b["service_charge"] or 0) + float(b["pharmacy_charge"] or 0)

        # Bulk-imported bills carry the whole amount in gross/net/cash
        # fields rather than the category-specific charge columns
        # (consultation_charge/lab_charge/radiology_charge), because the
        # importer only knows "this is a lab/radiology/OPD bill" from its
        # bill_no prefix, not a per-line breakdown. So if none of the
        # category columns are populated, fall back to the bill's paid+due
        # total so the bill still contributes somewhere instead of vanishing
        # from every bucket.
        bn_upper = (b.get("bill_no") or "").upper()
        if consult_charge == 0 and lab == 0 and radiology == 0 and proc == 0 and other == 0:
            fallback_total = paid + due
            if bn_upper.startswith("OPR"):
                radiology = fallback_total
            elif bn_upper.startswith("OPINV"):
                lab = fallback_total
            else:
                consult_charge = fallback_total

        appointment_id = b.get("appointment_id")
        created = b.get("created_at")
        bill_day = (created.date() if hasattr(created, "date") else created) if created else None

        kind = _classify_op_bill(
            b.get("bill_no"), appointment_id,
            consult_charge, lab, radiology, proc,
            b.get("patient_id"), bill_day, consult_days,
        )

        if kind == "ip_diagnostics":
            deferred_ip_diag.append(b)
            continue

        if kind == "op_radiology":
            parts = {"radiology": radiology or (paid + due)}
            bucket_map = {"radiology": op_radiology}
        elif kind == "direct":
            parts = {
                "consult": consult_charge + other,
                "lab": lab,
                "radiology": radiology,
            }
            bucket_map = {
                "consult": direct_patients,
                "lab": direct_diagnostics,
                "radiology": direct_radiology,
            }
        else:  # 'op'
            parts = {
                "consult": consult_charge + other,
                "lab": lab,
                "radiology": radiology,
            }
            bucket_map = {
                "consult": op_billing,
                "lab": op_diagnostics,
                "radiology": op_radiology,
            }

        _distribute(paid, mode, split, parts, bucket_map)

        total_parts = sum(parts.values()) or 0
        if due and total_parts > 0:
            if kind == "op_radiology":
                op_due_lab_radiology += due
            else:
                op_due_direct += due * ((parts.get("consult", 0)) / total_parts)
                op_due_lab_radiology += due * (
                    (parts.get("lab", 0) + parts.get("radiology", 0)) / total_parts
                )

    # ----- IP bills --------------------------------------------------------
    ip_cols = {c["Field"] for c in query("SHOW COLUMNS FROM ip_bills", many=True)}
    has_ip_mode = "payment_mode" in ip_cols
    has_ip_split = "payment_split" in ip_cols

    mode_select = "payment_mode" if has_ip_mode else "'Cash' AS payment_mode"
    split_select = "payment_split" if has_ip_split else "NULL AS payment_split"

    ip_bills = query(f"""
        SELECT id, admission_id, ip_registration_id, admission_charge, room_charge,
               doctor_visit_charge, lab_charge, radiology_charge, ot_charge,
               procedure_charge, medicine_charge, nursing_charge, service_charge,
               food_charge, misc_charge, paid_amount, due_amount,
               {mode_select}, {split_select}
        FROM ip_bills
        WHERE DATE(created_at) BETWEEN %s AND %s
          AND status <> 'Cancelled'
    """, (start_date, end_date), many=True)

    for b in ip_bills:
        paid = float(b["paid_amount"] or 0)
        due = float(b["due_amount"] or 0)
        mode = b.get("payment_mode") or "Cash"
        split = b.get("payment_split")

        lab = float(b["lab_charge"] or 0)
        radiology = float(b["radiology_charge"] or 0)
        other = (
            float(b["admission_charge"] or 0)
            + float(b["room_charge"] or 0)
            + float(b["doctor_visit_charge"] or 0)
            + float(b["ot_charge"] or 0)
            + float(b["procedure_charge"] or 0)
            + float(b["medicine_charge"] or 0)
            + float(b["nursing_charge"] or 0)
            + float(b["service_charge"] or 0)
            + float(b["food_charge"] or 0)
            + float(b["misc_charge"] or 0)
        )

        parts = {"other": other, "lab": lab, "radiology": radiology}
        bucket_map = {
            "other": ip_income,
            "lab": ip_diagnostics,
            "radiology": ip_radiology,
        }
        _distribute(paid, mode, split, parts, bucket_map)

        total_parts = sum(parts.values()) or 1
        if due:
            ip_due_bill += due * (other / total_parts)
            ip_due_lab_radiology += due * ((lab + radiology) / total_parts)

    # ----- Deferred IPD* bills found in op_bills ---------------------------
    for b in deferred_ip_diag:
        paid = float(b["paid_amount"] or 0)
        due = float(b["due_amount"] or 0)
        mode = b.get("payment_mode")
        split = b.get("payment_split")
        lab = float(b["lab_charge"] or 0)
        radiology = float(b.get("radiology_charge") or 0)

        parts = {"lab": lab or (paid + due), "radiology": radiology}
        bucket_map = {"lab": ip_diagnostics, "radiology": ip_radiology}
        _distribute(paid, mode, split, parts, bucket_map)

        if due:
            ip_due_lab_radiology += due

    # ----- Refunds ---------------------------------------------------------
    refunds = query("""
        SELECT bill_type, IFNULL(SUM(amount),0) s
        FROM billing_actions
        WHERE action_type='Advance_Refund'
          AND DATE(created_at) BETWEEN %s AND %s
        GROUP BY bill_type
    """, (start_date, end_date), many=True)
    refund_map = {r["bill_type"]: float(r["s"]) for r in refunds}

    # ----- Totals ----------------------------------------------------------
    total_income = (
        op_billing["total"] + op_diagnostics["total"] + op_radiology["total"]
        + direct_patients["total"] + direct_diagnostics["total"] + direct_radiology["total"]
        + ip_income["total"] + ip_diagnostics["total"] + ip_radiology["total"]
    )
    expenses = 0.0
    grand_total = total_income - expenses

    users_count = query("SELECT COUNT(*) c FROM users WHERE is_active=1")["c"]
    doctors_count = query("SELECT COUNT(*) c FROM doctors")["c"]

    return jsonify({
        "range": {"start_date": start_date, "end_date": end_date},
        "meta": {
            "users": users_count,
            "doctors": doctors_count,
            "last_updated": datetime.now().isoformat(),
            "sms_remaining": None,
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
            "total_due": (
                op_due_direct + op_due_lab_radiology
                + ip_due_bill + ip_due_lab_radiology
            ),
        },
    })