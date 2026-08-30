from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit

lab_tests_bp = Blueprint("lab_tests", __name__)

def blank_to_none(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

def safe_float(val):
    try:
        return float(str(val).strip() or 0)
    except (ValueError, TypeError):
        return 0

# ============================================================
# BASIC CRUD FOR LAB TESTS
# ============================================================

@lab_tests_bp.route("", methods=["GET"])
@jwt_required()
def list_lab_tests():
    search = request.args.get("search", "")
    is_active = request.args.get("is_active")

    sql = """
        SELECT id, test_name, short_name, cost, is_active, created_at, updated_at
        FROM lab_tests
        WHERE 1=1
    """
    params = []

    if search:
        sql += " AND test_name LIKE %s"
        params.append(f"%{search}%")
    
    if is_active is not None:
        sql += " AND is_active = %s"
        params.append(1 if is_active in ('1', 'true', 'True') else 0)

    sql += " ORDER BY test_name"
    rows = query(sql, tuple(params), many=True)
    return jsonify(rows)

@lab_tests_bp.route("/<int:test_id>", methods=["GET"])
@jwt_required()
def get_lab_test(test_id):
    row = query("SELECT * FROM lab_tests WHERE id=%s", (test_id,))
    if not row:
        return jsonify({"error": "Lab test not found"}), 404
    return jsonify(row)

@lab_tests_bp.route("", methods=["POST"])
@jwt_required()
def upsert_lab_test():
    d = request.get_json() or {}
    test_id = d.get("id")
    actor_id = get_jwt_identity()

    test_name = d.get("test_name", "").strip()
    short_name = blank_to_none(d.get("short_name"))
    cost = safe_float(d.get("cost"))
    is_active = 1 if d.get("is_active") else 0

    if not test_name:
        return jsonify({"error": "Test name is required"}), 400

    if test_id:
        query("""
            UPDATE lab_tests
            SET test_name=%s, short_name=%s, cost=%s, is_active=%s
            WHERE id=%s
        """, (test_name, short_name, cost, is_active, test_id),
        fetch=False, commit=True)
        log_audit(actor_id, "UPDATE_LAB_TEST", "Lab Test", test_id)
        return jsonify({"id": test_id, "message": "Lab test updated"}), 200
    else:
        new_id = query("""
            INSERT INTO lab_tests (test_name, short_name, cost, is_active)
            VALUES (%s, %s, %s, %s)
        """, (test_name, short_name, cost, is_active),
        fetch=False, commit=True)
        log_audit(actor_id, "CREATE_LAB_TEST", "Lab Test", new_id)
        return jsonify({"id": new_id, "message": "Lab test created"}), 201

@lab_tests_bp.route("/<int:test_id>", methods=["DELETE"])
@jwt_required()
def delete_lab_test(test_id):
    row = query("SELECT id FROM lab_tests WHERE id=%s", (test_id,))
    if not row:
        return jsonify({"error": "Lab test not found"}), 404
    query("DELETE FROM lab_tests WHERE id=%s", (test_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DELETE_LAB_TEST", "Lab Test", test_id)
    return jsonify({"success": True}), 200

# ============================================================
# IMPORT / EXPORT
# ============================================================

@lab_tests_bp.route("/import", methods=["POST"])
@jwt_required()
def import_lab_tests():
    data = request.get_json() or {}
    tests_list = data.get("tests", [])
    if not tests_list:
        return jsonify({"error": "No data provided"}), 400

    actor_id = get_jwt_identity()
    imported = 0
    errors = []

    for idx, row in enumerate(tests_list):
        try:
            test_name = row.get("TEST NAME", "").strip()
            cost = safe_float(row.get("COST"))

            if not test_name:
                errors.append(f"Row {idx+1}: Test name is required")
                continue

            existing = query("SELECT id FROM lab_tests WHERE test_name=%s", (test_name,))
            if existing:
                query("UPDATE lab_tests SET cost=%s WHERE id=%s", (cost, existing["id"]), fetch=False, commit=True)
                imported += 1
            else:
                query("""
                    INSERT INTO lab_tests (test_name, cost, is_active)
                    VALUES (%s, %s, 1)
                """, (test_name, cost), fetch=False, commit=True)
                imported += 1

        except Exception as e:
            errors.append(f"Row {idx+1}: {str(e)}")

    log_audit(actor_id, "IMPORT_LAB_TESTS", "Lab Test", 0, f"Imported {imported} lab tests")
    return jsonify({
        "imported": imported,
        "errors": errors,
        "message": f"Successfully imported {imported} lab tests"
    }), 200

@lab_tests_bp.route("/export", methods=["GET"])
@jwt_required()
def export_lab_tests():
    rows = query("""
        SELECT test_name AS `TEST NAME`,
               cost AS COST,
               IF(is_active=1, 'Active', 'Inactive') AS Status
        FROM lab_tests
        ORDER BY test_name
    """, many=True)
    return jsonify(rows)

# ============================================================
# LAB TEST ATTRIBUTES (new)
# ============================================================

@lab_tests_bp.route("/<int:test_id>/detail", methods=["GET"])
@jwt_required()
def get_test_detail(test_id):
    test = query("SELECT * FROM lab_tests WHERE id=%s", (test_id,))
    if not test:
        return jsonify({"error": "Test not found"}), 404
    
    attributes = query("""
        SELECT id, attribute_name, unit, normal_range, is_active
        FROM lab_test_attributes
        WHERE lab_test_id=%s
        ORDER BY attribute_name
    """, (test_id,), many=True)
    
    test["attributes"] = attributes
    return jsonify(test)

@lab_tests_bp.route("/<int:test_id>/attributes", methods=["POST"])
@jwt_required()
def upsert_attribute(test_id):
    d = request.get_json() or {}
    attr_id = d.get("id")
    attribute_name = d.get("attribute_name", "").strip()
    unit = d.get("unit", "").strip()
    normal_range = d.get("normal_range", "").strip()
    is_active = 1 if d.get("is_active") else 0
    
    if not attribute_name:
        return jsonify({"error": "Attribute name is required"}), 400
    
    test = query("SELECT id FROM lab_tests WHERE id=%s", (test_id,))
    if not test:
        return jsonify({"error": "Test not found"}), 404
    
    if attr_id:
        query("""
            UPDATE lab_test_attributes
            SET attribute_name=%s, unit=%s, normal_range=%s, is_active=%s
            WHERE id=%s AND lab_test_id=%s
        """, (attribute_name, unit, normal_range, is_active, attr_id, test_id),
        fetch=False, commit=True)
        log_audit(get_jwt_identity(), "UPDATE_ATTRIBUTE", "Lab Test Attribute", attr_id)
        return jsonify({"id": attr_id, "message": "Attribute updated"}), 200
    else:
        new_id = query("""
            INSERT INTO lab_test_attributes (lab_test_id, attribute_name, unit, normal_range, is_active)
            VALUES (%s, %s, %s, %s, %s)
        """, (test_id, attribute_name, unit, normal_range, is_active),
        fetch=False, commit=True)
        log_audit(get_jwt_identity(), "CREATE_ATTRIBUTE", "Lab Test Attribute", new_id)
        return jsonify({"id": new_id, "message": "Attribute added"}), 201

@lab_tests_bp.route("/attributes/<int:attr_id>", methods=["DELETE"])
@jwt_required()
def delete_attribute(attr_id):
    row = query("SELECT id FROM lab_test_attributes WHERE id=%s", (attr_id,))
    if not row:
        return jsonify({"error": "Attribute not found"}), 404
    query("DELETE FROM lab_test_attributes WHERE id=%s", (attr_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DELETE_ATTRIBUTE", "Lab Test Attribute", attr_id)
    return jsonify({"success": True}), 200