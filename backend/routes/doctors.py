from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
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