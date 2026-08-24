from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query
import json

discharge_summary_bp = Blueprint("discharge_summary", __name__)


def blank_to_none(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v


@discharge_summary_bp.route("/<int:ip_registration_id>", methods=["GET"])
@jwt_required()
def get_discharge_summary(ip_registration_id):
    admission = query("SELECT id FROM ip_registrations WHERE id=%s", (ip_registration_id,))
    if not admission:
        return jsonify({"error": "IP registration not found"}), 404

    row = query("""
        SELECT id, ip_registration_id, surgery_date, doctor_id, department,
               diagnosis, `procedure`, complaint, past_history, drug_history,
               surgical_history, examination, investigations, course_hospitalization,
               condition_discharge, discharge_advise, created_at, updated_at
        FROM discharge_summaries
        WHERE ip_registration_id=%s
    """, (ip_registration_id,))

    if not row:
        return jsonify(None), 200

    # Parse JSON fields
    if row.get("examination") and isinstance(row["examination"], str):
        try:
            row["examination"] = json.loads(row["examination"])
        except:
            row["examination"] = {}
    if row.get("discharge_advise") and isinstance(row["discharge_advise"], str):
        try:
            row["discharge_advise"] = json.loads(row["discharge_advise"])
        except:
            row["discharge_advise"] = []

    return jsonify(row), 200

@discharge_summary_bp.route("", methods=["POST"])
@jwt_required()
def upsert_discharge_summary():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    ip_registration_id = data.get("ip_registration_id")
    if not ip_registration_id:
        return jsonify({"error": "ip_registration_id is required"}), 400

    admission = query("SELECT id FROM ip_registrations WHERE id=%s", (ip_registration_id,))
    if not admission:
        return jsonify({"error": "Invalid ip_registration_id"}), 404

    # Extract fields
    surgery_date = blank_to_none(data.get("surgery_date"))
    doctor_id = blank_to_none(data.get("doctor_id"))
    department = blank_to_none(data.get("department"))
    diagnosis = data.get("diagnosis")
    procedure = data.get("procedure")
    complaint = data.get("complaint")
    past_history = data.get("past_history")
    drug_history = data.get("drug_history")
    surgical_history = data.get("surgical_history")
    examination = data.get("examination")
    investigations = data.get("investigations")
    course_hospitalization = data.get("course_hospitalization")
    condition_discharge = data.get("condition_discharge")
    discharge_advise = data.get("discharge_advise")

    # Serialize JSON fields
    if examination and isinstance(examination, dict):
        examination = json.dumps(examination)
    elif examination is None:
        examination = None
    if discharge_advise and isinstance(discharge_advise, list):
        discharge_advise = json.dumps(discharge_advise)
    elif discharge_advise is None:
        discharge_advise = None

    existing = query("SELECT id FROM discharge_summaries WHERE ip_registration_id=%s", (ip_registration_id,))

    if existing:
        query("""
            UPDATE discharge_summaries
            SET surgery_date=%s, doctor_id=%s, department=%s,
                diagnosis=%s, `procedure`=%s, complaint=%s,
                past_history=%s, drug_history=%s, surgical_history=%s,
                examination=%s, investigations=%s,
                course_hospitalization=%s, condition_discharge=%s,
                discharge_advise=%s
            WHERE ip_registration_id=%s
        """, (
            surgery_date, doctor_id, department,
            diagnosis, procedure, complaint,
            past_history, drug_history, surgical_history,
            examination, investigations,
            course_hospitalization, condition_discharge,
            discharge_advise,
            ip_registration_id
        ), fetch=False, commit=True)

        updated = query("SELECT * FROM discharge_summaries WHERE ip_registration_id=%s", (ip_registration_id,))
        return jsonify(updated), 200
    else:
        new_id = query("""
            INSERT INTO discharge_summaries (
                ip_registration_id, surgery_date, doctor_id, department,
                diagnosis, `procedure`, complaint,
                past_history, drug_history, surgical_history,
                examination, investigations,
                course_hospitalization, condition_discharge,
                discharge_advise
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s,
                %s
            )
        """, (
            ip_registration_id, surgery_date, doctor_id, department,
            diagnosis, procedure, complaint,
            past_history, drug_history, surgical_history,
            examination, investigations,
            course_hospitalization, condition_discharge,
            discharge_advise
        ), fetch=False, commit=True)

        inserted = query("SELECT * FROM discharge_summaries WHERE id=%s", (new_id,))
        return jsonify(inserted), 201