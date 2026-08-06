from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from db import query

auth_bp = Blueprint("auth", __name__)

ALLOWED_ROLES = ["super_admin", "admin", "executive", "doctor", "lab_technician"]


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "executive")

    if not all([name, email, password]):
        return jsonify({"error": "name, email, password are required"}), 400
    if role not in ALLOWED_ROLES:
        return jsonify({"error": "invalid role"}), 400

    existing = query("SELECT id FROM users WHERE email=%s", (email,))
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    pw_hash = generate_password_hash(password)
    user_id = query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
        (name, email, pw_hash, role), fetch=False, commit=True
    )
    return jsonify({"message": "User registered", "id": user_id}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = query("SELECT * FROM users WHERE email=%s AND is_active=1", (email,))

    # Wrong email, or account not seeded/registered yet
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Wrong password
    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": user["role"], "name": user["name"], "email": user["email"]}
    )
    return jsonify({
        "access_token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
    })


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    return jsonify({"id": get_jwt_identity(), "name": claims.get("name"),
                     "email": claims.get("email"), "role": claims.get("role")})