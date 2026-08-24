from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

catalog_bp = Blueprint("catalog", __name__)

@catalog_bp.route("/lab", methods=["GET"])
@jwt_required()
def list_lab_catalog():
    search = request.args.get("search", "").strip()
    like = f"%{search}%"

    rows = query("""
        SELECT
            id,
            department,
            investigation_name,
            rate
        FROM lab_catalog
        WHERE is_active = 1
          AND (
              investigation_name LIKE %s
              OR department LIKE %s
          )
        ORDER BY department, investigation_name
    """, (like, like), many=True)

    return jsonify(rows)

@catalog_bp.route("/services", methods=["GET"])
@jwt_required()
def list_service_catalog():
    search = request.args.get("search", "").strip()
    service_type = request.args.get("type", "").strip()
    like = f"%{search}%"

    sql = """
        SELECT
            id,
            service_type,
            service_name,
            description,
            charge_type,
            rate
        FROM service_catalog
        WHERE is_active = 1
          AND (
              service_name LIKE %s
              OR service_type LIKE %s
          )
    """

    params = [like, like]

    if service_type:
        sql += " AND service_type = %s"
        params.append(service_type)

    sql += """
        ORDER BY service_type, service_name
    """

    rows = query(sql, tuple(params), many=True)

    return jsonify(rows)

@catalog_bp.route("/procedures", methods=["GET"])
@jwt_required()
def list_procedure_catalog():
    search = request.args.get("search", "").strip()
    procedure_type = request.args.get("type", "").strip()

    sql = """
        SELECT
            id,
            procedure_type,
            procedure_name,
            description,
            rate,
            is_active
        FROM procedure_catalog
        WHERE is_active = 1
    """

    params = []

    if search:
        like = f"%{search}%"

        sql += """
            AND (
                procedure_name LIKE %s
                OR procedure_type LIKE %s
            )
        """

        params.extend([like, like])

    if procedure_type:
        sql += " AND procedure_type = %s"
        params.append(procedure_type)

    sql += """
        ORDER BY procedure_type, procedure_name
    """

    rows = query(sql, tuple(params), many=True)

    return jsonify(rows), 200