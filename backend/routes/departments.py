from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import query

departments_bp = Blueprint("departments", __name__)


@departments_bp.route("", methods=["GET"])
@jwt_required()
def list_departments():
    rows = query("""
        SELECT id, name
        FROM departments
        ORDER BY name
    """, many=True)
    return jsonify(rows)