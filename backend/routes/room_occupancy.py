from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query

room_occupancy_bp = Blueprint("room_occupancy", __name__)


@room_occupancy_bp.route("", methods=["GET"])
@jwt_required()
def occupancy():
    search = request.args.get("search", "")
    like = f"%{search}%"

    rows = query("""
        SELECT w.name AS floor_name, r.id AS room_id, r.room_no, r.room_type,
               COUNT(b.id) AS total_beds,
               SUM(CASE WHEN b.status='Occupied' THEN 1 ELSE 0 END) AS occupied_beds,
               SUM(CASE WHEN b.status='Available' THEN 1 ELSE 0 END) AS available_beds
        FROM rooms r
        JOIN wards w ON w.id = r.ward_id
        LEFT JOIN beds b ON b.room_id = r.id
        WHERE w.name LIKE %s OR r.room_no LIKE %s OR r.room_type LIKE %s
        GROUP BY r.id
        ORDER BY w.name, r.room_no
    """, (like, like, like), many=True)

    for row in rows:
        beds = query("SELECT bed_no, status FROM beds WHERE room_id=%s ORDER BY bed_no", (row["room_id"],), many=True)
        row["beds"] = beds

    return jsonify(rows)