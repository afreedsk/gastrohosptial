from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from db import query
from utils import log_audit, role_required

users_bp = Blueprint("users", __name__)

ALLOWED_ROLES = ["super_admin", "admin", "executive", "doctor", "lab_technician"]


@users_bp.route("", methods=["GET"])
@jwt_required()
@role_required("super_admin", "admin")  # admins can view, only super_admin can modify
def list_users():
    rows = query(
        "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id DESC",
        many=True,
    )
    return jsonify(rows)


@users_bp.route("", methods=["POST"])
@jwt_required()
@role_required("super_admin")
def create_user():
    d = request.get_json(silent=True) or {}
    name = d.get("name")
    email = d.get("email")
    password = d.get("password")
    role = d.get("role", "executive")

    if not all([name, email, password]):
        return jsonify({"error": "name, email, password are required"}), 400
    if role not in ALLOWED_ROLES:
        return jsonify({"error": "invalid role"}), 400

    existing = query("SELECT id FROM users WHERE email=%s", (email,))
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    pw_hash = generate_password_hash(password)
    actor_id = get_jwt_identity()
    user_id = query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
        (name, email, pw_hash, role),
        fetch=False, commit=True,
    )
    log_audit(actor_id, "CREATE_USER", "User Management", user_id, f"Created {email} as {role}")
    return jsonify(query(
        "SELECT id, name, email, role, is_active, created_at FROM users WHERE id=%s", (user_id,)
    )), 201


@users_bp.route("/<int:user_id>/role", methods=["PATCH"])
@jwt_required()
@role_required("super_admin")
def update_role(user_id):
    d = request.get_json(silent=True) or {}
    role = d.get("role")
    if role not in ALLOWED_ROLES:
        return jsonify({"error": "invalid role"}), 400

    actor_id = get_jwt_identity()
    if int(actor_id) == user_id and role != "super_admin":
        return jsonify({"error": "You cannot demote your own account"}), 400

    target = query("SELECT id, email FROM users WHERE id=%s", (user_id,))
    if not target:
        return jsonify({"error": "User not found"}), 404

    query("UPDATE users SET role=%s WHERE id=%s", (role, user_id), fetch=False, commit=True)
    log_audit(actor_id, "UPDATE_ROLE", "User Management", user_id, f"Role changed to {role}")
    return jsonify(query(
        "SELECT id, name, email, role, is_active, created_at FROM users WHERE id=%s", (user_id,)
    ))


@users_bp.route("/<int:user_id>/status", methods=["PATCH"])
@jwt_required()
@role_required("super_admin")
def update_status(user_id):
    d = request.get_json(silent=True) or {}
    is_active = d.get("is_active")
    if is_active is None:
        return jsonify({"error": "is_active is required"}), 400

    actor_id = get_jwt_identity()
    if int(actor_id) == user_id and not is_active:
        return jsonify({"error": "You cannot deactivate your own account"}), 400

    target = query("SELECT id FROM users WHERE id=%s", (user_id,))
    if not target:
        return jsonify({"error": "User not found"}), 404

    query("UPDATE users SET is_active=%s WHERE id=%s", (1 if is_active else 0, user_id),
          fetch=False, commit=True)
    log_audit(actor_id, "STATUS_CHANGE", "User Management", user_id,
              f"{'Activated' if is_active else 'Deactivated'} user")
    return jsonify(query(
        "SELECT id, name, email, role, is_active, created_at FROM users WHERE id=%s", (user_id,)
    ))


@users_bp.route("/<int:user_id>/reset-password", methods=["POST"])
@jwt_required()
@role_required("super_admin")
def reset_password(user_id):
    d = request.get_json(silent=True) or {}
    new_password = d.get("password")
    if not new_password or len(new_password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400

    target = query("SELECT id FROM users WHERE id=%s", (user_id,))
    if not target:
        return jsonify({"error": "User not found"}), 404

    pw_hash = generate_password_hash(new_password)
    query("UPDATE users SET password_hash=%s WHERE id=%s", (pw_hash, user_id),
          fetch=False, commit=True)
    log_audit(get_jwt_identity(), "PASSWORD_RESET", "User Management", user_id,
              "Password reset by super admin")
    return jsonify({"message": "Password reset successfully"})