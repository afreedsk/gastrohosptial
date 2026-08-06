import sys
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
    # This crashes on startup with a clear message instead of failing silently
    # later on every request with a generic 500. Most common causes:
    #  - MySQL isn't running
    #  - DB_USER / DB_PASSWORD in .env don't match your MySQL account
    #  - DB_NAME ("hms_db" by default) hasn't been created yet -> run db.sql first
    print("\n[DB CONNECTION FAILED]", e, file=sys.stderr)
    print("Check backend/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) "
          "and confirm you ran: mysql -u root -p < backend/db.sql\n", file=sys.stderr)
    raise


def get_db():
    return pool.get_connection()


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
        # Re-raise with the SQL attached so it shows up in the Flask terminal
        print(f"\n[DB QUERY FAILED] {e}\nSQL: {sql}\nParams: {params}\n", file=sys.stderr)
        raise
    finally:
        cur.close()
        conn.close()