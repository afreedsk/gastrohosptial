import sys
from datetime import timedelta, date, datetime
from decimal import Decimal
import mysql.connector
from mysql.connector import pooling
from config import Config

try:
    pool = pooling.MySQLConnectionPool(
        pool_name="hms_pool",
        pool_size=10,
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
    )
except mysql.connector.Error as e:
    print("\n[DB CONNECTION FAILED]", e, file=sys.stderr)
    print("Check backend/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) "
          "and confirm you ran: mysql -u root -p < backend/db.sql\n", file=sys.stderr)
    raise


def get_db():
    return pool.get_connection()


def _serialize_value(v):
    """Convert DB driver types that json.dumps can't handle into JSON-safe types."""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, timedelta):
        # MySQL TIME columns come back as timedelta (not datetime.time) from
        # mysql-connector-python. Render as HH:MM:SS.
        total_seconds = int(v.total_seconds())
        sign = "-" if total_seconds < 0 else ""
        total_seconds = abs(total_seconds)
        h, rem = divmod(total_seconds, 3600)
        m, s = divmod(rem, 60)
        return f"{sign}{h:02d}:{m:02d}:{s:02d}"
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def _serialize_row(row):
    if row is None:
        return None
    return {k: _serialize_value(v) for k, v in row.items()}


def query(sql, params=None, fetch=True, many=False, commit=False):
    """Run a query and return dict rows. Handles insert/update with commit."""
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params or ())
        result = None
        if fetch:
            if many:
                result = [_serialize_row(r) for r in cur.fetchall()]
            else:
                result = _serialize_row(cur.fetchone())
        if commit:
            conn.commit()
            result = cur.lastrowid
        return result
    except mysql.connector.Error as e:
        conn.rollback()
        print(f"\n[DB QUERY FAILED] {e}\nSQL: {sql}\nParams: {params}\n", file=sys.stderr)
        raise
    finally:
        cur.close()
        conn.close()