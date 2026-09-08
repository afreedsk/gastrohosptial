import os
import io
import pandas as pd
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt
from db import get_db, query
from routes.import_service import start_import_job
from routes.import_service_lab import start_lab_import_job

bulk_import_bp = Blueprint("bulk_import", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

IMPORT_HANDLERS = {
    "opd_bills": start_import_job,
    "lab_bills": start_lab_import_job,
}


def require_super_admin():
    claims = get_jwt()
    return claims.get("role") == "super_admin"


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
        (file.filename, import_type), fetch=False, commit=True
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
        (batch_id,), many=True
    )
    return jsonify(rows or [])


@bulk_import_bp.route("/export/op-bills", methods=["GET"])
@jwt_required()
def export_op_bills():
    if not require_super_admin():
        return jsonify({"error": "Forbidden"}), 403

    from_date = request.args.get("from")
    to_date = request.args.get("to")

    sql = """
        SELECT b.bill_no, p.patient_uid AS mr_number, r.opd_reg_no, p.name AS patient_name,
               p.phone, r.area, d.name AS doctor_name, b.cash_amount, b.lab_charge,
               b.gross_total, b.discount, b.net_total, b.paid_amount, b.due_amount,
               b.payment_mode, b.remarks, b.created_at
        FROM op_bills b
        JOIN patients p ON p.id = b.patient_id
        LEFT JOIN op_registrations r ON r.patient_id = p.id
        LEFT JOIN doctors d ON d.id = r.doctor_id
        WHERE 1=1
    """
    params = []
    if from_date:
        sql += " AND b.created_at >= %s"
        params.append(from_date)
    if to_date:
        sql += " AND b.created_at <= %s"
        params.append(to_date)

    conn = get_db()
    df = pd.read_sql(sql, conn, params=params)
    conn.close()

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="OP Bills")
    output.seek(0)

    return send_file(output, as_attachment=True, download_name="op_bills_export.xlsx",
                      mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")