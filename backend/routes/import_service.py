import re
import json
import threading
import pandas as pd
from datetime import datetime
from db import get_db

COLUMN_MAP = {
    "CreatedAt": "created_at", "Bill.No": "bill_no", "MR Number": "mr_number",
    "Patient Reg No": "patient_reg_no", "Patient Name": "patient_name",
    "Phone": "phone", "Age/Gender": "age_gender", "DOB": "dob", "Area": "area",
    "Doctor Name": "doctor_name", "Date": "bill_date", "Service": "service",
    "Cash": "cash", "Card": "card", "UPI": "upi", "Bank": "bank", "Total": "total",
    "Referral": "referral", "MLC Patient": "mlc_patient", "MLC Number": "mlc_number",
    "Remarks": "remarks",
}

# op_registrations.referral_type / op_bills.referral_type enum-ish values
REFERRAL_MAP = {
    "walk-in": "Walkin", "walkin": "Walkin", "online": "Online", "doctor": "Doctor",
    "hospital user": "Hospital User", "camp": "Camp", "ads": "Ads",
    "friend/family": "Friend/Family", "marketing": "Marketing",
}

TITLE_RE = re.compile(r"^(Mr\.|Mrs\.|Miss\.|Ms\.|Dr\.|Master\.)\s*", re.IGNORECASE)


def parse_age_gender(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None, None
    parts = str(val).split("/")
    age = None
    gender = None
    if len(parts) >= 1:
        m = re.search(r"(\d+)", parts[0])
        if m:
            age = int(m.group(1))
    if len(parts) >= 2:
        g = parts[1].strip().lower()
        gender = "Male" if g.startswith("m") else "Female" if g.startswith("f") else "Other"
    return age, gender


def parse_date_flex(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    if not s:
        return None
    formats = ["%d/%m/%Y %H:%M", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y %H:%M"]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    try:
        dt = pd.to_datetime(s, dayfirst=True, errors="raise")
        return dt.to_pydatetime()
    except Exception:
        return None


def split_name(raw_name):
    if raw_name is None or (isinstance(raw_name, float) and pd.isna(raw_name)):
        return None, "Unknown"
    m = TITLE_RE.match(str(raw_name).strip())
    title = m.group(1).rstrip(".") if m else None
    rest = TITLE_RE.sub("", str(raw_name)).strip()
    rest = re.sub(r"\s+", " ", rest)
    return title, rest or "Unknown"


def normalize_referral(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return "Walkin"
    return REFERRAL_MAP.get(str(val).strip().lower(), "Other")


def to_decimal(val):
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return 0
        return float(val)
    except (ValueError, TypeError):
        return 0


def clean_str(val):
    """Return a clean string or None — handles NaN, empty strings, and whitespace."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s if s else None


def get_or_create_doctor(cur, name):
    clean_name_check = clean_str(name)
    if not clean_name_check:
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


def upsert_op_registration(cur, patient_id, doctor_id, opd_reg_no, title, first_name,
                            gender, dob, mobile, area, referral_type, referral_doctor_name,
                            mlc, mlc_number, bill_date):
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
          referral_doctor_name, mlc, clean_str(mlc_number), bill_date))
    return cur.lastrowid


def upsert_op_bill(cur, bill_no, patient_id, cash, card, upi, bank, total,
                    service_text, remarks, created_at, referral_type,
                    referral_doctor_name, mlc, mlc_number):
    cur.execute("SELECT id FROM op_bills WHERE bill_no = %s", (bill_no,))
    if cur.fetchone():
        return False  # already exists, skip

    # op_bills.payment_mode enum has no 'Mixed' -> pick the dominant method
    amounts = {"Cash": cash, "Card": card, "UPI": upi, "Bank": bank}
    payment_mode = max(amounts, key=amounts.get) if any(amounts.values()) else "Cash"

    # no dedicated card/upi/bank columns -> store the full split as JSON
    payment_split = json.dumps({"cash": cash, "card": card, "upi": upi, "bank": bank})

    # no service_summary column -> fold service text into remarks, safely
    service_clean = clean_str(service_text)
    remarks_clean = clean_str(remarks)
    full_remarks = " | ".join(x for x in [service_clean, remarks_clean] if x)

    cur.execute("""
        INSERT INTO op_bills
        (bill_no, patient_id, gross_total, net_total, paid_amount, due_amount,
         cash_amount, payment_mode, payment_split, referral_type, referral_doctor_name,
         mlc, mlc_number, remarks, status, created_at)
        VALUES (%s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, 'Paid', %s)
    """, (bill_no, patient_id, total, total, total, cash, payment_mode, payment_split,
          referral_type, referral_doctor_name, mlc, clean_str(mlc_number),
          full_remarks or None, created_at))
    return True


def process_batch(batch_id, filepath):
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    try:
        cur.execute("UPDATE import_batches SET status='Processing' WHERE id=%s", (batch_id,))
        conn.commit()

        if filepath.lower().endswith(".csv"):
            df = pd.read_csv(filepath, dtype=str)
        else:
            df = pd.read_excel(filepath, dtype=str)

        df = df.rename(columns=COLUMN_MAP)
        # Critical: pandas represents empty cells as NaN (a float), which breaks
        # string handling and json.dumps(). Convert every NaN to a real None.
        df = df.where(pd.notnull(df), None)

        total_rows = len(df)
        cur.execute("UPDATE import_batches SET total_rows=%s WHERE id=%s", (total_rows, batch_id))
        conn.commit()

        inserted = updated = failed = processed = 0

        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                age, gender = parse_age_gender(row.get("age_gender"))
                dob = parse_date_flex(row.get("dob"))
                bill_date = parse_date_flex(row.get("bill_date")) or parse_date_flex(row.get("created_at"))
                created_at = parse_date_flex(row.get("created_at")) or bill_date

                doctor_name = row.get("doctor_name")
                doctor_id = get_or_create_doctor(cur, doctor_name)
                patient_id = get_or_create_patient(
                    cur, row.get("mr_number"), row.get("patient_name"),
                    row.get("phone"), gender, dob, age
                )
                title, first_name = split_name(row.get("patient_name"))
                mlc_val = clean_str(row.get("mlc_patient"))
                mlc = 1 if mlc_val and mlc_val.lower() == "yes" else 0
                mlc_number = row.get("mlc_number")
                referral_type = normalize_referral(row.get("referral"))
                referral_doctor_name = (
                    split_name(doctor_name)[1] if referral_type == "Doctor" and clean_str(doctor_name) else None
                )

                upsert_op_registration(
                    cur, patient_id, doctor_id, row.get("patient_reg_no"),
                    title, first_name, gender, dob, row.get("phone"),
                    row.get("area"), referral_type, referral_doctor_name,
                    mlc, mlc_number, bill_date
                )

                was_inserted = upsert_op_bill(
                    cur, row.get("bill_no"), patient_id,
                    to_decimal(row.get("cash")), to_decimal(row.get("card")),
                    to_decimal(row.get("upi")), to_decimal(row.get("bank")),
                    to_decimal(row.get("total")), row.get("service"),
                    row.get("remarks"), created_at, referral_type,
                    referral_doctor_name, mlc, mlc_number
                )
                conn.commit()
                inserted += 1 if was_inserted else 0
                updated += 0 if was_inserted else 1

            except Exception as e:
                conn.rollback()
                failed += 1
                try:
                    # row.to_dict() may still contain non-JSON-safe values (e.g. Timestamps);
                    # default=str handles those. NaN is no longer an issue since we cleaned df already.
                    raw_json = json.dumps(row.to_dict(), default=str)
                except Exception:
                    raw_json = json.dumps({"error": "could not serialize row"})

                cur.execute("""
                    INSERT INTO import_errors (batch_id, row_no, error_message, raw_data)
                    VALUES (%s, %s, %s, %s)
                """, (batch_id, row_num, str(e), raw_json))
                conn.commit()

            processed += 1
            if processed % 100 == 0 or processed == total_rows:
                cur.execute("""
                    UPDATE import_batches
                    SET processed_rows=%s, inserted_rows=%s, updated_rows=%s, failed_rows=%s
                    WHERE id=%s
                """, (processed, inserted, updated, failed, batch_id))
                conn.commit()

        cur.execute("UPDATE import_batches SET status='Completed', completed_at=NOW() WHERE id=%s", (batch_id,))
        conn.commit()

    except Exception:
        conn.rollback()
        cur.execute("UPDATE import_batches SET status='Failed', completed_at=NOW() WHERE id=%s", (batch_id,))
        conn.commit()
        raise
    finally:
        cur.close()
        conn.close()


def start_import_job(batch_id, filepath):
    thread = threading.Thread(target=process_batch, args=(batch_id, filepath), daemon=True)
    thread.start()