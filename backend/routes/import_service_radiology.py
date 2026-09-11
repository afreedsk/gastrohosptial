import re
import threading
import pandas as pd
from db import get_db
from routes.common_import import (
    clean_str, to_decimal, parse_date_flex, parse_age, split_name,
    normalize_gender, normalize_referral, normalize_payment_mode,
    get_or_create_doctor, get_or_create_patient, get_or_create_op_registration,
    get_user_id_by_name, safe_json_dump,
)

COLUMN_MAP = {
    "Date": "bill_date", "MR Number": "mr_number", "Patient Reg.No": "patient_reg_no",
    "Patient Name": "patient_name", "Gender": "gender", "Age": "age", "Phone": "phone",
    "Doctor Name": "doctor_name", "Invoice No": "invoice_no", "Investigations": "investigations",
    "Ref Amount": "ref_amount", "Total Amount": "total_amount", "Discount": "discount",
    "Due Discount": "due_discount", "BillAmount": "bill_amount", "PaidAmount": "paid_amount",
    "Due Amount": "due_amount", "Pay Mode": "pay_mode", "User Name": "user_name",
    "Referral Type": "referral_type", "Referral Doctor": "referral_doctor",
}

OP_BILLS_PAYMENT_MODES = ["Cash", "Card", "UPI", "Insurance", "Credit", "Bank"]

# A genuine data row's Date column always starts with a real calendar date
# (dd/mm/yyyy, dd-mm-yyyy, or yyyy-mm-dd). This is intentionally checked on
# the RAW "Date" column, before COLUMN_MAP renaming, so it still works even
# if the caller passes an un-renamed dataframe.
_DATE_LIKE_RE = re.compile(r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|^\d{4}-\d{2}-\d{2}")


def load_radiology_rates(cur):
    """Preload lab_tests catalog into a normalized-name -> cost lookup (shared catalog with lab)."""
    cur.execute("SELECT test_name, cost FROM lab_tests WHERE is_active = 1")
    rates = {}
    for row in cur.fetchall():
        key = " ".join(row["test_name"].split()).strip().lower()
        rates[key] = float(row["cost"] or 0)
    return rates


def lookup_rate(rate_map, test_name):
    key = " ".join(test_name.split()).strip().lower()
    return rate_map.get(key, 0)


def clean_referral_doctor(val):
    """'Doctor - AKBAR VALI(RMP)' -> 'AKBAR VALI(RMP)'"""
    s = clean_str(val)
    if not s:
        return None
    return s.split("-", 1)[1].strip() if "-" in s else s


def upsert_radiology_bill(cur, invoice_no, patient_id, total_amount, discount, due_discount,
                           bill_amount, paid_amount, due_amount, pay_mode, referral_type,
                           referral_doctor_name, created_by, bill_date):
    cur.execute("SELECT id FROM op_bills WHERE bill_no = %s", (invoice_no,))
    row = cur.fetchone()
    if row:
        return row["id"], False  # already imported, skip line items too

    total_discount = discount + due_discount
    payment_mode = normalize_payment_mode(pay_mode, OP_BILLS_PAYMENT_MODES)
    status = "Paid" if due_amount <= 0 else ("Due" if paid_amount <= 0 else "Partial")

    cur.execute("""
        INSERT INTO op_bills
        (bill_no, patient_id, radiology_charge, gross_total, discount, net_total,
         paid_amount, due_amount, payment_mode, referral_type, referral_doctor_name,
         status, created_by, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (invoice_no, patient_id, total_amount, total_amount, total_discount, bill_amount,
          paid_amount, due_amount, payment_mode, referral_type, referral_doctor_name,
          status, created_by, bill_date))
    return cur.lastrowid, True


def insert_radiology_items(cur, op_registration_id, investigations_text, rate_map, bill_date):
    """Splits the comma-separated investigations string into op_radiology line items.

    bill_date is passed through and written into created_at explicitly.
    Without this, MySQL's DEFAULT CURRENT_TIMESTAMP stamps every line item
    with the moment the import script ran, not the real bill date — which
    breaks any date-range filtering on these rows.
    """
    if not investigations_text:
        return
    names = [n.strip() for n in investigations_text.split(",") if n.strip()]
    for name in names:
        rate = lookup_rate(rate_map, name)
        cur.execute("""
            INSERT INTO op_radiology (op_registration_id, item_name, quantity, rate, amount, created_at)
            VALUES (%s, %s, 1, %s, %s, %s)
        """, (op_registration_id, name, rate, rate, bill_date))


def _looks_like_date(val):
    if val is None:
        return False
    return bool(_DATE_LIKE_RE.match(str(val).strip()))


def _strip_junk_rows(raw_df, date_col="Date"):
    """
    Real hospital exports of this type can end with MUCH more than a
    trailing blank line: after a 'Grand Total' row, some exports append an
    entire SECOND table — a 'Cancel Data' / cancelled-bills report — with a
    completely different column layout (Patient Reg.No, Patient Name,
    Invoice No, Lab & Radiology, Created At, Created By, Cancelled At,
    Cancelled User, Cancelled Amount, Reason). Because that table has its
    own header row further down the file, pandas still parses those rows
    using the FIRST table's headers, which silently shifts every field into
    the wrong column: the investigation/scan list ends up in "Doctor Name",
    a timestamp ends up in "Invoice No", etc.

    Checking that MR Number / Invoice No are merely non-blank does NOT catch
    this — those columns are non-blank in the mismapped rows too, just wrong.
    If left unfiltered, this would create a "doctor" record whose name is a
    full scan/procedure list, use the wrong invoice numbers, and attribute
    bogus radiology items to real patients.

    The one column that is reliably safe to check is "Date": a genuine
    billing row always has a real calendar date there. The 'Grand Total'
    line, blank rows, repeated header rows, and every row from the mismapped
    cancellation table all fail this check, because whatever value ended up
    in the Date column (a MR number, a name, blank, etc.) is never a
    real date. This is checked on the RAW, un-renamed "Date" column so it
    runs before COLUMN_MAP renaming and doesn't depend on it.
    """
    if date_col not in raw_df.columns:
        return raw_df, 0
    before = len(raw_df)
    mask = raw_df[date_col].apply(_looks_like_date)
    cleaned = raw_df[mask]
    skipped = before - len(cleaned)
    return cleaned, skipped


def process_radiology_batch(batch_id, filepath):
    conn = get_db()
    # IMPORTANT: buffered=True. Without it, mysql-connector-python's C extension
    # cursor can leave a SELECT's result set only partially "acknowledged" as
    # drained even after fetchone() returns the row you wanted. The next
    # cur.execute() call then raises:
    #   mysql.connector.errors.InternalError: Unread result found
    # Buffered cursors read the entire result set into memory immediately on
    # execute(), so there is never anything left "unread" between queries.
    cur = conn.cursor(dictionary=True, buffered=True)

    try:
        cur.execute("UPDATE import_batches SET status='Processing' WHERE id=%s", (batch_id,))
        conn.commit()

        df = pd.read_csv(filepath, dtype=str) if filepath.lower().endswith(".csv") \
            else pd.read_excel(filepath, dtype=str)

        # Drop trailer/junk rows (Grand Total lines, blank rows, repeated
        # header rows, and any mismapped "Cancel Data" trailer table) BEFORE
        # renaming columns, using the raw "Date" column — a much stronger
        # signal than checking MR Number / Invoice No are non-blank, which
        # does not catch mismapped rows (see _strip_junk_rows docstring).
        df, skipped_junk_rows = _strip_junk_rows(df, date_col="Date")

        df = df.rename(columns=COLUMN_MAP)
        df = df.where(pd.notnull(df), None)

        total_rows = len(df)
        cur.execute("UPDATE import_batches SET total_rows=%s WHERE id=%s", (total_rows, batch_id))
        conn.commit()

        rate_map = load_radiology_rates(cur)
        inserted = updated = failed = processed = 0

        for idx, row in df.iterrows():
            row_num = idx + 2  # +2: 1-indexed CSV rows, plus header row
            try:
                bill_date = parse_date_flex(row.get("bill_date"))
                age = parse_age(row.get("age"))
                gender = normalize_gender(row.get("gender"))

                doctor_name = row.get("doctor_name")
                doctor_id = get_or_create_doctor(cur, doctor_name)
                patient_id = get_or_create_patient(
                    cur, row.get("mr_number"), row.get("patient_name"),
                    row.get("phone"), gender, None, age
                )
                title, first_name = split_name(row.get("patient_name"))

                referral_type = normalize_referral(row.get("referral_type"))
                referral_doctor_name = clean_referral_doctor(row.get("referral_doctor"))

                op_reg_id = get_or_create_op_registration(
                    cur, patient_id, doctor_id, row.get("patient_reg_no"),
                    title, first_name, gender, None, row.get("phone"),
                    None, referral_type, referral_doctor_name,
                    0, None, bill_date
                )

                created_by = get_user_id_by_name(cur, row.get("user_name"))

                bill_id, was_inserted = upsert_radiology_bill(
                    cur, row.get("invoice_no"), patient_id,
                    to_decimal(row.get("total_amount")), to_decimal(row.get("discount")),
                    to_decimal(row.get("due_discount")), to_decimal(row.get("bill_amount")),
                    to_decimal(row.get("paid_amount")), to_decimal(row.get("due_amount")),
                    row.get("pay_mode"), referral_type, referral_doctor_name,
                    created_by, bill_date
                )

                if was_inserted:
                    insert_radiology_items(cur, op_reg_id, row.get("investigations"), rate_map, bill_date)

                conn.commit()
                inserted += 1 if was_inserted else 0
                updated += 0 if was_inserted else 1

            except Exception as e:
                conn.rollback()
                failed += 1
                # Guard the error-logging insert itself: if THIS insert fails,
                # it must never be allowed to kill the whole batch thread.
                try:
                    cur.execute("""
                        INSERT INTO import_errors (batch_id, row_no, error_message, raw_data)
                        VALUES (%s, %s, %s, %s)
                    """, (batch_id, row_num, str(e), safe_json_dump(row.to_dict())))
                    conn.commit()
                except Exception:
                    conn.rollback()

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


def start_radiology_import_job(batch_id, filepath):
    thread = threading.Thread(target=process_radiology_batch, args=(batch_id, filepath), daemon=True)
    thread.start()