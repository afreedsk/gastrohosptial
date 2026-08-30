from db import query

def next_code(prefix, table, column):
    """
    Generate sequential codes like SGR000001, OP000001, IP000001.
    prefix: e.g., 'SGR', 'OP', 'IP'
    table: table name
    column: column name to query for the last code
    """
    row = query(f"SELECT {column} FROM {table} ORDER BY id DESC LIMIT 1")
    if row and row[column]:
        last = row[column]
        if last.startswith(prefix):
            try:
                num = int(last[len(prefix):]) + 1
                return f"{prefix}{num:06d}"
            except ValueError:
                pass
    return f"{prefix}000001"


def log_audit(user_id, action, module, reference_id=None, reason=None):
    query(
        "INSERT INTO audit_logs (user_id, action, module, reference_id, reason) VALUES (%s,%s,%s,%s,%s)",
        (user_id, action, module, reference_id, reason),
        fetch=False,
        commit=True,
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