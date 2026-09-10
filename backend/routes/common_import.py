import re
import json
import pandas as pd
from datetime import datetime

TITLE_RE = re.compile(r"^(Mr\.|Mrs\.|Miss\.|Ms\.|Dr\.|Master\.)\s*", re.IGNORECASE)

REFERRAL_MAP = {
    "walk-in": "Walkin", "walkin": "Walkin", "online": "Online", "doctor": "Doctor",
    "hospital user": "Hospital User", "camp": "Camp", "ads": "Ads",
    "friend/family": "Friend/Family", "marketing": "Marketing",
}


def clean_str(val):
    """Return a clean string or None — handles NaN, empty strings, whitespace."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s if s else None


def to_decimal(val):
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return 0
        return float(val)
    except (ValueError, TypeError):
        return 0


def parse_date_flex(val):
    s = clean_str(val)
    if not s:
        return None
    formats = ["%d/%m/%Y %H:%M", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y %H:%M"]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    try:
        return pd.to_datetime(s, dayfirst=True, errors="raise").to_pydatetime()
    except Exception:
        return None


def parse_age(val):
    """Handles both '55Y' style and plain '55/Male' combined style."""
    s = clean_str(val)
    if not s:
        return None
    m = re.search(r"(\d+)", s)
    return int(m.group(1)) if m else None


def parse_age_gender_combined(val):
    """For files where Age/Gender come combined like '70Y / Female'."""
    s = clean_str(val)
    if not s:
        return None, None
    parts = s.split("/")
    age = parse_age(parts[0]) if parts else None
    gender = None
    if len(parts) >= 2:
        g = parts[1].strip().lower()
        gender = "Male" if g.startswith("m") else "Female" if g.startswith("f") else "Other"
    return age, gender


def split_name(raw_name):
    s = clean_str(raw_name)
    if not s:
        return None, "Unknown"
    m = TITLE_RE.match(s)
    title = m.group(1).rstrip(".") if m else None
    rest = TITLE_RE.sub("", s).strip()
    rest = re.sub(r"\s+", " ", rest)
    return title, rest or "Unknown"


def normalize_gender(val):
    s = clean_str(val)
    if not s:
        return "Other"
    s = s.lower()
    return "Male" if s.startswith("m") else "Female" if s.startswith("f") else "Other"


def normalize_referral(val):
    s = clean_str(val)
    if not s:
        return "Walkin"
    return REFERRAL_MAP.get(s.lower(), "Other")


def normalize_payment_mode(val, allowed):
    """Maps free-text pay-mode strings (e.g. 'UPI - PhonePe') to a fixed enum set."""
    s = clean_str(val)
    if not s:
        return "Cash"
    token = s.split("-")[0].strip().lower()
    for opt in allowed:
        if opt.lower() == token:
            return opt
    # loose contains-match fallback (e.g. "upi" in "upi - phonepe")
    for opt in allowed:
        if opt.lower() in s.lower():
            return opt
    return "Cash"


def get_or_create_doctor(cur, name):
    if not clean_str(name):
        return None
    _, clean_name = split_name(name)
    cur.execute("SELECT id FROM doctors WHERE name = %s", (clean_name,))
    row = cur.fetchone()
    if row:
        return row["id"]
    cur.execute("INSERT INTO doctors (name) VALUES (%s)", (clean_name,))
    return cur.lastrowid


def get_or_create_patient(cur, mr_number, patient_name, phone, gender, dob, age):
    cur.execute("SELECT id FROM patients WHERE patient_uid = %s", (mr_number,))
    row = cur.fetchone()
    if row:
        return row["id"]
    _, clean_name = split_name(patient_name)
    cur.execute("""
        INSERT INTO patients (patient_uid, reg_no, name, gender, dob, age, phone, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 1)
    """, (mr_number, mr_number, clean_name, gender or "Other", dob, age,
          clean_str(phone) or "0000000000"))
    return cur.lastrowid


def get_or_create_op_registration(cur, patient_id, doctor_id, opd_reg_no, title, first_name,
                                   gender, dob, mobile, area, referral_type, referral_doctor_name,
                                   mlc, mlc_number, appt_date):
    cur.execute("SELECT id FROM op_registrations WHERE opd_reg_no = %s", (opd_reg_no,))
    row = cur.fetchone()
    if row:
        return row["id"]
    cur.execute("""
        INSERT INTO op_registrations
        (patient_id, opd_reg_no, token_no, title, first_name, gender, dob, mobile,
         area, doctor_id, referral_type, referral_doctor_name, mlc, mlc_number,
         appointment_date, status)
        VALUES (%s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Completed')
    """, (patient_id, opd_reg_no, title, first_name, gender or "Other", dob,
          clean_str(mobile) or "0000000000", clean_str(area), doctor_id, referral_type,
          referral_doctor_name, mlc, clean_str(mlc_number), appt_date))
    return cur.lastrowid


def get_user_id_by_name(cur, name):
    """Looks up an existing user by name — never auto-creates login accounts."""
    n = clean_str(name)
    if not n:
        return None
    cur.execute("SELECT id FROM users WHERE name = %s", (n,))
    row = cur.fetchone()
    return row["id"] if row else None


def safe_json_dump(row_dict):
    """Serialize a row to JSON safely for storage in a MySQL JSON column.

    pandas represents blank/missing CSV cells as float('nan'). Python's
    json.dumps() allows NaN/Infinity by default and writes them as bare
    tokens (NaN, Infinity, -Infinity) — which is NOT valid JSON per spec,
    and MySQL's native JSON column type rejects it with:
        Invalid JSON text: "Invalid value."
    That failure used to happen *inside* the except block that logs
    import errors, with nothing catching it — killing the whole import
    thread. This version converts NaN/inf floats to None (-> JSON null)
    before dumping, and sets allow_nan=False as a belt-and-braces check
    so any leftover non-finite float raises immediately and falls into
    the fallback branch instead of producing invalid JSON.
    """
    def _clean(v):
        if isinstance(v, float) and (v != v or v in (float("inf"), float("-inf"))):
            return None  # NaN / inf / -inf -> null, which is valid JSON
        return v

    try:
        cleaned = {k: _clean(v) for k, v in row_dict.items()}
        return json.dumps(cleaned, default=str, allow_nan=False)
    except Exception:
        return json.dumps({"error": "could not serialize row"})