import os
import io
import csv
import pandas as pd
from datetime import datetime

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt

from db import get_db, query
from routes.import_service import start_import_job
from routes.import_service_lab import start_lab_import_job
from routes.import_service_radiology import start_radiology_import_job

# Optional PDF support — install with: pip install reportlab
try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    )
    from reportlab.lib.units import mm
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


bulk_import_bp = Blueprint("bulk_import", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

IMPORT_HANDLERS = {
    "opd_bills": start_import_job,
    "lab_bills": start_lab_import_job,
    "radiology_bills": start_radiology_import_job,
}


def require_super_admin():
    claims = get_jwt()
    return claims.get("role") == "super_admin"


# ===========================================================================
# IMPORT ENDPOINTS (unchanged)
# ===========================================================================
@bulk_import_bp.route("/import/upload", methods=["POST"])
@jwt_required()
def upload():
    if not require_super_admin():
        return jsonify({"error": "Forbidden"}), 403

    file = request.files.get("file")
    import_type = request.form.get("import_type", "opd_bills")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400
    if not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
        return jsonify({"error": "Only CSV/Excel files allowed"}), 400
    if import_type not in IMPORT_HANDLERS:
        return jsonify({"error": f"Unknown import_type: {import_type}"}), 400

    filepath = os.path.join(UPLOAD_DIR, file.filename)
    file.save(filepath)

    batch_id = query(
        "INSERT INTO import_batches (filename, import_type, status) VALUES (%s, %s, 'Queued')",
        (file.filename, import_type), fetch=False, commit=True,
    )

    IMPORT_HANDLERS[import_type](batch_id, filepath)

    return jsonify({"batch_id": batch_id, "message": "Import started"}), 202


@bulk_import_bp.route("/import/status/<int:batch_id>", methods=["GET"])
@jwt_required()
def import_status(batch_id):
    row = query("SELECT * FROM import_batches WHERE id=%s", (batch_id,), many=False)
    if not row:
        return jsonify({"error": "Batch not found"}), 404
    for k in ("created_at", "completed_at"):
        if row.get(k):
            row[k] = row[k].isoformat()
    return jsonify(row)


@bulk_import_bp.route("/import/errors/<int:batch_id>", methods=["GET"])
@jwt_required()
def import_errors(batch_id):
    rows = query(
        "SELECT row_no, error_message, raw_data FROM import_errors WHERE batch_id=%s ORDER BY row_no",
        (batch_id,), many=True,
    )
    return jsonify(rows or [])


# ===========================================================================
# EXPORT ENDPOINTS
# ---------------------------------------------------------------------------
# Supported URLs:
#   GET /api/superadmin/export/op-bills?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|xlsx|pdf
#   GET /api/superadmin/export/lab-bills?from=...&to=...&format=...
#   GET /api/superadmin/export/radiology-bills?from=...&to=...&format=...
# ===========================================================================

# Full column set for CSV / Excel export.
EXPORT_COLUMNS = [
    ("bill_no",             "Bill No"),
    ("bill_date",           "Bill Date"),
    ("mr_number",           "MR Number"),
    ("opd_reg_no",          "OPD Reg No"),
    ("patient_name",        "Patient Name"),
    ("phone",               "Phone"),
    ("doctor_name",         "Doctor"),
    ("consultation_charge", "Consultation"),
    ("lab_charge",          "Lab"),
    ("radiology_charge",    "Radiology"),
    ("procedure_charge",    "Procedure"),
    ("service_charge",      "Service"),
    ("pharmacy_charge",     "Pharmacy"),
    ("gross_total",         "Gross Total"),
    ("discount",            "Discount"),
    ("net_total",           "Net Total"),
    ("paid_amount",         "Paid"),
    ("due_amount",          "Due"),
    ("payment_mode",        "Payment Mode"),
    ("status",              "Status"),
    ("referral_type",       "Referral"),
    ("referral_doctor_name","Referral Doctor"),
    ("remarks",             "Remarks"),
    ("created_at",          "Created At"),
]

# Narrower set for the PDF (landscape A4 doesn't fit 24 columns legibly).
PDF_COLUMNS = [
    ("bill_no",        "Bill No"),
    ("bill_date",      "Date"),
    ("mr_number",      "MR No"),
    ("patient_name",   "Patient"),
    ("phone",          "Phone"),
    ("doctor_name",    "Doctor"),
    ("net_total",      "Net"),
    ("paid_amount",    "Paid"),
    ("due_amount",     "Due"),
    ("payment_mode",   "Mode"),
    ("status",         "Status"),
]

BILL_TYPES = {
    "opd": {
        "title": "OP Billing Report",
        "slug": "op-bills",
        "extra_where": "",
    },
    "lab": {
        "title": "OP Lab Billing Report",
        "slug": "lab-bills",
        "extra_where": "AND b.lab_charge > 0",
    },
    "radiology": {
        "title": "OP Radiology Billing Report",
        "slug": "radiology-bills",
        "extra_where": "AND b.radiology_charge > 0",
    },
}


def _fetch_bills(bill_type: str, from_date: str, to_date: str):
    """
    Fetch bills for the given type between [from_date, to_date] inclusive.
    Uses a raw buffered cursor instead of pandas.read_sql to avoid the
    SQLAlchemy UserWarning and to keep DB drivers identical to the rest of
    the app.
    """
    cfg = BILL_TYPES[bill_type]
    sql = f"""
        SELECT
            b.bill_no,
            DATE(b.created_at)              AS bill_date,
            b.created_at                    AS created_at,
            p.patient_uid                   AS mr_number,
            r.opd_reg_no                    AS opd_reg_no,
            p.name                          AS patient_name,
            p.phone                         AS phone,
            d.name                          AS doctor_name,
            b.consultation_charge,
            b.lab_charge,
            b.radiology_charge,
            b.procedure_charge,
            b.service_charge,
            b.pharmacy_charge,
            b.gross_total,
            b.discount,
            b.net_total,
            b.paid_amount,
            b.due_amount,
            b.payment_mode,
            b.status,
            b.referral_type,
            b.referral_doctor_name,
            b.remarks
        FROM op_bills b
        JOIN patients p ON p.id = b.patient_id
        LEFT JOIN op_registrations r
               ON r.id = (
                    SELECT id FROM op_registrations
                    WHERE patient_id = p.id
                    ORDER BY id DESC LIMIT 1
               )
        LEFT JOIN doctors d ON d.id = r.doctor_id
        WHERE b.status <> 'Cancelled'
          AND DATE(b.created_at) BETWEEN %s AND %s
          {cfg['extra_where']}
        ORDER BY b.created_at DESC, b.id DESC
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True, buffered=True)
    try:
        cur.execute(sql, (from_date, to_date))
        rows = cur.fetchall() or []
    finally:
        cur.close()
        conn.close()
    return rows


def _stringify(v):
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    return str(v)


def _rows_to_csv(rows, columns):
    output = io.StringIO()
    output.write("\ufeff")  # BOM so Excel opens UTF-8 correctly
    writer = csv.writer(output)
    writer.writerow([label for _, label in columns])
    for r in rows:
        writer.writerow([_stringify(r.get(key)) for key, _ in columns])
    return io.BytesIO(output.getvalue().encode("utf-8"))


def _rows_to_excel(rows, columns, sheet_name="Bills"):
    headers = [label for _, label in columns]
    data = [[_stringify(r.get(key)) for key, _ in columns] for r in rows]
    df = pd.DataFrame(data, columns=headers)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheet_name)
    output.seek(0)
    return output


def _rows_to_pdf(rows, columns, title, from_date, to_date):
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError(
            "PDF export requires 'reportlab'. Install it with: pip install reportlab"
        )

    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        leftMargin=10 * mm, rightMargin=10 * mm,
        topMargin=10 * mm, bottomMargin=10 * mm,
        title=title,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleX", parent=styles["Title"], fontSize=14, spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "SubX", parent=styles["Normal"], fontSize=9, textColor=colors.grey,
    )

    elements = [
        Paragraph(title, title_style),
        Paragraph(f"Period: {from_date} → {to_date}  |  Records: {len(rows)}", sub_style),
        Spacer(1, 4 * mm),
    ]

    data = [[label for _, label in columns]]
    for r in rows:
        data.append([
            _stringify(r.get(key)) for key, _ in columns
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), colors.HexColor("#0E7C7B")),
        ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, -1), 7.5),
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("ALIGN",        (0, 0), (-1, 0), "LEFT"),
        ("ALIGN",        (6, 1), (-1, -1), "RIGHT"),  # numeric columns right-aligned
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("GRID",         (0, 0), (-1, -1), 0.25, colors.HexColor("#CCCCCC")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFA")]),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)
    output.seek(0)
    return output


def _export_bills_response(bill_type):
    if not require_super_admin():
        return jsonify({"error": "Forbidden"}), 403
    if bill_type not in BILL_TYPES:
        return jsonify({"error": f"Unknown bill type: {bill_type}"}), 400

    fmt = (request.args.get("format") or "xlsx").lower()
    if fmt not in ("csv", "xlsx", "pdf"):
        return jsonify({"error": f"Unknown format: {fmt}. Use csv, xlsx, or pdf"}), 400

    from_date = request.args.get("from")
    to_date = request.args.get("to")
    if not from_date or not to_date:
        return jsonify({"error": "Both 'from' and 'to' dates are required (YYYY-MM-DD)"}), 400

    cfg = BILL_TYPES[bill_type]
    try:
        rows = _fetch_bills(bill_type, from_date, to_date)
    except Exception as e:
        return jsonify({"error": f"Query failed: {e}"}), 500

    base_name = f"{cfg['slug']}_{from_date}_to_{to_date}"

    if fmt == "csv":
        buf = _rows_to_csv(rows, EXPORT_COLUMNS)
        return send_file(
            buf, as_attachment=True,
            download_name=f"{base_name}.csv",
            mimetype="text/csv",
        )

    if fmt == "xlsx":
        buf = _rows_to_excel(rows, EXPORT_COLUMNS, sheet_name=cfg["title"][:28])
        return send_file(
            buf, as_attachment=True,
            download_name=f"{base_name}.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    # PDF
    try:
        buf = _rows_to_pdf(rows, PDF_COLUMNS, cfg["title"], from_date, to_date)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    return send_file(
        buf, as_attachment=True,
        download_name=f"{base_name}.pdf",
        mimetype="application/pdf",
    )


@bulk_import_bp.route("/export/op-bills", methods=["GET"])
@jwt_required()
def export_op_bills():
    return _export_bills_response("opd")


@bulk_import_bp.route("/export/lab-bills", methods=["GET"])
@jwt_required()
def export_lab_bills():
    return _export_bills_response("lab")


@bulk_import_bp.route("/export/radiology-bills", methods=["GET"])
@jwt_required()
def export_radiology_bills():
    return _export_bills_response("radiology")