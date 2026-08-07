"""
One-time script to create the first super_admin.
Run: python seed_superadmin.py
"""
from werkzeug.security import generate_password_hash
from db import query

NAME = "Super Admin"
EMAIL = "admin1@hms.com"
PASSWORD = "Admin@123"  # change immediately after first login

existing = query("SELECT id FROM users WHERE email=%s", (EMAIL,))
if existing:
    print(f"User {EMAIL} already exists (id={existing['id']}). No action taken.")
else:
    pw_hash = generate_password_hash(PASSWORD)
    user_id = query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
        (NAME, EMAIL, pw_hash, "super_admin"),
        fetch=False, commit=True,
    )
    print(f"Created super_admin id={user_id}, email={EMAIL}, password={PASSWORD}")
    print("Log in and change this password immediately.")