# Hospital Management System — Executive Module

Full-stack implementation: **React (Vite)** frontend, **Flask** REST API, **MySQL** database.
This delivers the entire Executive/Reception module you specced: Dashboard, Patient
Registration, Appointments, OP Billing, IP Billing, Admission, Billing Modifications, and Reports.

```
hms/
├── backend/     Flask REST API (JWT auth, RBAC, MySQL)
└── frontend/    React + Vite + Tailwind executive console
```

## 1. Database setup

```bash
mysql -u root -p < backend/db.sql
```

This creates the `hms_db` database, every table (patients, appointments, admissions, wards/rooms/beds,
op_bills, ip_bills, billing_actions, audit_logs, etc.), and seeds departments/doctors/wards/rooms/beds.

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then edit DB_PASSWORD / JWT_SECRET_KEY
python app.py                     # runs on http://localhost:5000
```

Create your first user (do this once, e.g. with curl or Postman):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Reception Desk","email":"reception@hms.com","password":"Reception@123","role":"executive"}'
```

Roles: `super_admin`, `admin`, `executive`, `doctor`, `lab_technician`.
Billing Modifications actions require `admin` or `super_admin`.

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev                       # runs on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5000`, so no CORS config is needed locally.

Log in at `http://localhost:5173/login` with the account you registered, and you'll land on
`/executive/dashboard`.

## What's implemented

| Module | Backend | Frontend |
|---|---|---|
| Auth (JWT + RBAC) | ✅ `/api/auth` | ✅ Login page, protected routes |
| Dashboard | ✅ `/api/dashboard/*` | ✅ 8 stat cards + 4 charts (Recharts) |
| Patient Registration | ✅ `/api/patients` (auto Patient ID + Reg No, age calc) | ✅ Full form + live search list |
| Appointments | ✅ `/api/appointments` (token auto-gen, reschedule/cancel) | ✅ Booking form + status actions |
| OP Billing | ✅ `/api/op-billing` (auto GST/discount/due calc) | ✅ Live-calculated bill form |
| IP Billing | ✅ `/api/ip-billing` (auto room-charge, tax calc) | ✅ Full charge breakdown form |
| Admission | ✅ `/api/admissions` (admit/transfer/discharge/cancel, bed status) | ✅ Ward→Room→Bed cascading form |
| Billing Modifications | ✅ `/api/billing-management/actions` (role-gated, audited) | ✅ Action form + audit table |
| Reports | ✅ `/api/reports/*` (patient/billing/lab/admission) | ✅ Tabbed report viewer + CSV export |

Every write action is recorded to `audit_logs` (user, timestamp, module, reason) via `utils.log_audit`.

## Extending it

- **PDF/Excel export**: report CSV export is included; wire in `pandas`/`openpyxl` (backend) or
  `xlsx`/`jsPDF` (frontend) if you need native `.xlsx`/`.pdf` downloads instead of CSV.
- **Lab module UI**: `lab_tests` table + `/api/reports/lab/*` are ready; add a dedicated
  Lab Technician page when you build that role.
- **Other roles**: Super Admin, Admin, Doctor, Lab Technician dashboards can reuse the same
  `ExecutiveLayout` pattern with role-specific nav items and `role_required()` guards.
