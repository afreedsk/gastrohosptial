import sys
import mysql.connector
from config import Config

def get_db():
    """Create a new database connection (no pooling)."""
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
    )

def query(sql, params=None, fetch=True, many=False, commit=False):
    """Run a query and return dict rows. Handles insert/update with commit."""
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params or ())
        result = None
        if fetch:
            result = cur.fetchall() if many else cur.fetchone()
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
        conn.close()   # always close the connection