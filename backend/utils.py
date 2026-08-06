from db import query

def next_code(prefix, table, column):
    """Generate sequential codes like PT-000001, APT-000002 etc."""
    row = query(f"SELECT {column} FROM {table} ORDER BY id DESC LIMIT 1")
    if not row or not row[column]:
        n = 1
    else:
        n = int(row[column].split("-")[1]) + 1
    return f"{prefix}-{n:06d}"

def log_audit(user_id, action, module, reference_id=None, reason=None):
    query(
        "INSERT INTO audit_logs (user_id, action, module, reference_id, reason) VALUES (%s,%s,%s,%s,%s)",
        (user_id, action, module, reference_id, reason),
        fetch=False, commit=True
    )

def role_required(*roles):
    from functools import wraps
    from flask_jwt_extended import get_jwt, verify_jwt_in_request
    from flask import jsonify

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
