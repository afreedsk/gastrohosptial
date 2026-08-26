from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query
from utils import log_audit, role_required
import json

permissions_bp = Blueprint("permissions", __name__)

# ---------- PERMISSION PROFILES ----------
@permissions_bp.route("/profiles", methods=["GET"])
@jwt_required()
@role_required("super_admin")
def list_profiles():
    rows = query("""
        SELECT id, name, description, permissions, is_active, created_at, updated_at
        FROM permission_profiles
        ORDER BY name
    """, many=True)
    for row in rows:
        if row.get("permissions"):
            try:
                row["permissions"] = json.loads(row["permissions"])
            except:
                row["permissions"] = []
    return jsonify(rows)

@permissions_bp.route("/profiles", methods=["POST"])
@jwt_required()
@role_required("super_admin")
def upsert_profile():
    d = request.get_json() or {}
    profile_id = d.get("id")
    name = d.get("name")
    description = d.get("description")
    permissions = d.get("permissions", [])
    is_active = 1 if d.get("is_active") else 0

    if not name:
        return jsonify({"error": "Profile name is required"}), 400

    permissions_json = json.dumps(permissions) if permissions else "[]"

    if profile_id:
        query("""
            UPDATE permission_profiles
            SET name=%s, description=%s, permissions=%s, is_active=%s
            WHERE id=%s
        """, (name, description, permissions_json, is_active, profile_id),
        fetch=False, commit=True)
        log_audit(get_jwt_identity(), "UPDATE_PROFILE", "Permission Profile", profile_id)
        return jsonify({"id": profile_id, "message": "Profile updated"}), 200
    else:
        new_id = query("""
            INSERT INTO permission_profiles (name, description, permissions, is_active)
            VALUES (%s, %s, %s, %s)
        """, (name, description, permissions_json, is_active),
        fetch=False, commit=True)
        log_audit(get_jwt_identity(), "CREATE_PROFILE", "Permission Profile", new_id)
        return jsonify({"id": new_id, "message": "Profile created"}), 201

@permissions_bp.route("/profiles/<int:profile_id>", methods=["DELETE"])
@jwt_required()
@role_required("super_admin")
def delete_profile(profile_id):
    row = query("SELECT id FROM permission_profiles WHERE id=%s", (profile_id,))
    if not row:
        return jsonify({"error": "Profile not found"}), 404
    query("DELETE FROM permission_profiles WHERE id=%s", (profile_id,), fetch=False, commit=True)
    log_audit(get_jwt_identity(), "DELETE_PROFILE", "Permission Profile", profile_id)
    return jsonify({"success": True}), 200

# ---------- MENU TREE ----------
@permissions_bp.route("/menu", methods=["GET"])
@jwt_required()
def get_menu():
    # This menu structure should be maintained to match your actual navigation.
    # For now, we provide a comprehensive list.
    menu = [
        {"label": "Dashboard", "path": "/executive/dashboard"},
        {"label": "Patient Registration", "path": "/executive/patient-registration"},
        {"label": "Appointments", "path": "/executive/appointments"},
        {
            "label": "Billing",
            "children": [
                {"label": "IP Billing", "path": "/executive/ip-billing"},
                {"label": "IP Advance", "path": "/executive/ip-advance"},
                {"label": "IP Lab", "path": "/executive/ip-lab"},
                {"label": "IP Services", "path": "/executive/ip-services"},
                {"label": "IP Procedures", "path": "/executive/ip-procedures"},
                {"label": "OP Billing", "path": "/executive/op-billing"},
                {"label": "OP Lab", "path": "/executive/op-lab"},
                {"label": "OP Services", "path": "/executive/op-services"},
                {"label": "OP Procedures", "path": "/executive/op-procedures"},
            ]
        },
        {
            "label": "IP Admission",
            "children": [
                {"label": "IP Details", "path": "/executive/ip-details"},
                {"label": "Admission", "path": "/executive/admission"},
                {"label": "Room Transfer", "path": "/executive/room-transfer-approval"},
                {"label": "Discharge Summary", "path": "/executive/discharge-summary"},
            ]
        },
        {
            "label": "Cancellations",
            "children": [
                {"label": "OP Consultation Cancel", "path": "/executive/cancellations/op-consultation"},
                {"label": "OP Billing Cancel", "path": "/executive/cancellations/op-billing"},
                {"label": "OP Lab Cancel", "path": "/executive/cancellations/op-lab"},
                {"label": "OP Lab Modifications", "path": "/executive/cancellations/op-lab-modifications"},
                {"label": "IP Lab Cancellation", "path": "/executive/cancellations/ip-lab"},
                {"label": "OP Services Cancellation", "path": "/executive/cancellations/op-services"},
                {"label": "IP Billing Cancellation", "path": "/executive/cancellations/ip-billing"},
                {"label": "IP Surgery Cancel", "path": "/executive/cancellations/ip-surgery"},
            ]
        },
        {
            "label": "Reports",
            "children": [
                {"label": "Inpatient Lab Reports", "path": "/executive/reports/ip-lab"},
                {"label": "Outpatient Lab Reports", "path": "/executive/reports/op-lab"},
                {"label": "Inpatient Radiology Reports", "path": "/executive/reports/ip-radiology"},
                {"label": "Outpatient Radiology Reports", "path": "/executive/reports/op-radiology"},
            ]
        },
        {
            "label": "Pharmacy",
            "children": [
                {"label": "Goods Receive Note", "path": "/pharmacy/transaction/goods-receive-note"},
                {"label": "Stock Adjustments", "path": "/pharmacy/transaction/stock-adjustments"},
                {"label": "Supplier Master", "path": "/pharmacy/masters/supplier"},
            ]
        },
        {
            "label": "Super Admin",
            "children": [
                {"label": "User Management", "path": "/superadmin/users"},
                {"label": "Doctor Master", "path": "/superadmin/doctors"},
                {"label": "Permission Profiles", "path": "/superadmin/permission-profiles"},
            ]
        }
    ]
    return jsonify(menu)