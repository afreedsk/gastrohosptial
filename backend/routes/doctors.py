from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import mysql.connector
from db import query

doctors_bp = Blueprint("doctors", __name__)


@doctors_bp.route("", methods=["GET"])
@jwt_required()
def list_doctors():
    rows = query("""
        SELECT d.id, d.name, d.consultation_fee, d.phone, dep.name AS department
        FROM doctors d LEFT JOIN departments dep ON dep.id = d.department_id
        ORDER BY d.name
    """, many=True)
    return jsonify(rows)


@doctors_bp.route("", methods=["POST"])
@jwt_required()
def create_doctor():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    department_id = data.get("department_id") or None
    consultation_fee = data.get("consultation_fee") or 0
    phone = (data.get("phone") or "").strip() or None

    if not name:
        return jsonify({"error": "Doctor name is required"}), 400

    try:
        new_id = query(
            """
            INSERT INTO doctors (name, department_id, consultation_fee, phone)
            VALUES (%s, %s, %s, %s)
            """,
            (name, department_id, consultation_fee, phone),
            fetch=False,
            commit=True,
        )
    except mysql.connector.Error:
        # e.g. an invalid department_id (FK constraint) or other DB-level
        # rejection. query() already logs the real SQL error to stderr.
        return jsonify({"error": "Could not save doctor — check the department is valid"}), 400

    doctor = query("""
        SELECT d.id, d.name, d.consultation_fee, d.phone, dep.name AS department
        FROM doctors d LEFT JOIN departments dep ON dep.id = d.department_id
        WHERE d.id = %s
    """, (new_id,))

    return jsonify(doctor), 201