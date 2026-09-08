import threading
import pandas as pd
from db import get_db
from routes.common_import import (
    clean_str, to_decimal, parse_date_flex, parse_age_gender_combined,
    split_name, normalize_referral, get_or_create_doctor, get_or_create_patient,
    get_or_create_op_registration, safe_json_dump,
)
import json

COLUMN_MAP = {
    "CreatedAt": "created_at", "Bill.No": "bill_no", "MR Number": "mr_number",
    "Patient Reg No": "patient_reg_no", "Patient Name": "patient_name",
    "Phone": "phone", "Age/Gender": "age_gender", "DOB": "dob", "Area": "area",
    "Doctor Name": "doctor_name", "Date": "bill_date", "Service": "service",
    "Cash": "cash", "Card": "card", "UPI": "upi", "Bank": "bank", "Total": "total",
    "Referral": "referral", "MLC Patient": "mlc_patient", "MLC Number": "mlc_number",
    "Remarks": "remarks",
}


def upsert_op_bill(cur, bill_no, patient_id, cash, card, upi, bank, total,
                    service_text, remarks, created_at, referral_type,
                    referral_doctor_name, mlc, mlc_number):
    cur.execute("SELECT id FROM op_bills WHERE bill_no = %s", (bill_no,))
    if cur.fetchone():
        return False

    amounts = {"Cash": cash, "Card": card, "UPI": upi, "Bank": bank}
    payment_mode = max(amounts, key=amounts.get) if any(amounts.values()) else "Cash"
    payment_split = json.dumps({"cash": cash, "card": card, "upi": upi, "bank": bank})

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

        df = pd.read_csv(filepath, dtype=str) if filepath.lower().endswith(".csv") \
            else pd.read_excel(filepath, dtype=str)
        df = df.rename(columns=COLUMN_MAP)
        df = df.where(pd.notnull(df), None)

        total_rows = len(df)
        cur.execute("UPDATE import_batches SET total_rows=%s WHERE id=%s", (total_rows, batch_id))
        conn.commit()

        inserted = updated = failed = processed = 0

        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                age, gender = parse_age_gender_combined(row.get("age_gender"))
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

                get_or_create_op_registration(
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
                cur.execute("""
                    INSERT INTO import_errors (batch_id, row_no, error_message, raw_data)
                    VALUES (%s, %s, %s, %s)
                """, (batch_id, row_num, str(e), safe_json_dump(row.to_dict())))
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