"""
seed.py — creates one default login per role (super_admin, admin, executive,
doctor, lab_technician) directly in the database.

Run from the backend/ folder, after db.sql has been applied:

    cd backend
    python seed.py

Uses the same DB config as the Flask app (config.py / .env), so make sure
.env is set up first.
"""

from werkzeug.security import generate_password_hash
from db import query

# name, email, password, role
USERS = [
    ("Super Admin",     "superadmin@hms.com", "SuperAdmin@123", "super_admin"),
    ("Admin Manager",   "admin@hms.com",       "Admin@123",      "admin"),
    ("Reception Desk",  "executive@hms.com",   "Executive@123",  "executive"),
    ("Dr. Rao",         "doctor@hms.com",      "Doctor@123",     "doctor"),
    ("Lab Technician",  "labtech@hms.com",     "LabTech@123",    "lab_technician"),
]


def seed_users():
    for name, email, password, role in USERS:
        existing = query("SELECT id FROM users WHERE email=%s", (email,))
        if existing:
            print(f"skip  {role:15s} {email}  (already exists)")
            continue

        pw_hash = generate_password_hash(password)
        query(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
            (name, email, pw_hash, role),
            fetch=False, commit=True
        )
        print(f"added {role:15s} {email}  password: {password}")


if __name__ == "__main__":
    seed_users()
    print("\nDone. Log in at /login with any of the accounts above.")