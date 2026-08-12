from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import mysql.connector
from db import query

referral_doctors_bp = Blueprint("referral_doctors", __name__)


@referral_doctors_bp.route("", methods=["GET"])
@jwt_required()
def list_referral_doctors():
    rows = query("""
        SELECT id, name, phone, hospital_name
        FROM referral_doctors
        ORDER BY name
    """, many=True)
    return jsonify(rows)


@referral_doctors_bp.route("", methods=["POST"])
@jwt_required()
def create_referral_doctor():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip() or None
    hospital_name = (data.get("hospital_name") or "").strip() or None

    if not name:
        return jsonify({"error": "Doctor name is required"}), 400

    try:
        new_id = query(
            """
            INSERT INTO referral_doctors (name, phone, hospital_name)
            VALUES (%s, %s, %s)
            """,
            (name, phone, hospital_name),
            fetch=False,
            commit=True,
        )
    except mysql.connector.Error:
        return jsonify({"error": "Could not save referring doctor"}), 400

    doctor = query(
        "SELECT id, name, phone, hospital_name FROM referral_doctors WHERE id = %s",
        (new_id,),
    )
    return jsonify(doctor), 201