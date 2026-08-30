-- ============================================
-- Hospital Management System - Executive Module
-- Full MySQL Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS hms_db;
USE hms_db;

-- ---------- Users / RBAC ----------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin','admin','executive','doctor','lab_technician') NOT NULL DEFAULT 'executive',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Departments / Doctors ----------
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL
);

CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    department_id INT,
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    phone VARCHAR(20),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ---------- Patients ----------
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_uid VARCHAR(20) UNIQUE NOT NULL,      -- Auto: PT-000001
    reg_no VARCHAR(20) UNIQUE NOT NULL,            -- Auto: REG-000001
    name VARCHAR(120) NOT NULL,
    gender ENUM('Male','Female','Other') NOT NULL,
    dob DATE,
    age INT,
    blood_group VARCHAR(5),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    email VARCHAR(150),
    phone VARCHAR(20) NOT NULL,
    alt_phone VARCHAR(20),
    aadhar_number VARCHAR(20),
    occupation VARCHAR(100),
    marital_status ENUM('Single','Married','Widowed','Divorced'),
    door_no VARCHAR(50),
    street VARCHAR(120),
    city VARCHAR(80),
    district VARCHAR(80),
    state VARCHAR(80),
    pincode VARCHAR(10),
    guardian_name VARCHAR(120),
    guardian_relation VARCHAR(50),
    guardian_phone VARCHAR(20),
    allergies TEXT,
    diabetes TINYINT(1) DEFAULT 0,
    hypertension TINYINT(1) DEFAULT 0,
    existing_diseases TEXT,
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- Appointments ----------
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_no VARCHAR(20) UNIQUE NOT NULL,   -- APT-000001
    patient_id INT NOT NULL,
    department_id INT,
    doctor_id INT,
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(20),
    token_no INT,
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    visit_type ENUM('New','Follow-up','Emergency') DEFAULT 'New',
    status ENUM('Booked','Completed','Cancelled','Rescheduled') DEFAULT 'Booked',
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- Wards / Rooms / Beds ----------
CREATE TABLE wards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL
);

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ward_id INT NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    room_type ENUM('General','Semi-Private','Private','ICU','Deluxe') DEFAULT 'General',
    rate_per_day DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE
);

CREATE TABLE beds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    bed_no VARCHAR(10) NOT NULL,
    status ENUM('Available','Occupied','Maintenance') DEFAULT 'Available',
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- ---------- Admissions (IP) ----------
CREATE TABLE admissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admission_no VARCHAR(20) UNIQUE NOT NULL,     -- ADM-000001
    patient_id INT NOT NULL,
    doctor_id INT,
    ward_id INT,
    room_id INT,
    bed_id INT,
    admission_date DATE NOT NULL,
    admission_time TIME,
    reason TEXT,
    diagnosis TEXT,
    advance_amount DECIMAL(10,2) DEFAULT 0,
    status ENUM('Admitted','Discharged','Cancelled','Transferred') DEFAULT 'Admitted',
    discharge_date DATETIME,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE room_transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    from_room_id INT,
    to_room_id INT,
    from_bed_id INT,
    to_bed_id INT,
    transfer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE
);

-- ---------- OP Billing ----------
CREATE TABLE op_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(20) UNIQUE NOT NULL,          -- OPB-000001
    patient_id INT NOT NULL,
    appointment_id INT,
    consultation_charge DECIMAL(10,2) DEFAULT 0,
    lab_charge DECIMAL(10,2) DEFAULT 0,
    procedure_charge DECIMAL(10,2) DEFAULT 0,
    service_charge DECIMAL(10,2) DEFAULT 0,
    pharmacy_charge DECIMAL(10,2) DEFAULT 0,
    gross_total DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    gst DECIMAL(10,2) DEFAULT 0,
    net_total DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    due_amount DECIMAL(10,2) DEFAULT 0,
    payment_mode ENUM('Cash','Card','UPI','Insurance','Credit') DEFAULT 'Cash',
    status ENUM('Paid','Partial','Due','Cancelled') DEFAULT 'Paid',
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- IP Billing ----------
CREATE TABLE ip_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(20) UNIQUE NOT NULL,          -- IPB-000001
    admission_id INT NOT NULL,
    admission_charge DECIMAL(10,2) DEFAULT 0,
    room_charge DECIMAL(10,2) DEFAULT 0,
    doctor_visit_charge DECIMAL(10,2) DEFAULT 0,
    lab_charge DECIMAL(10,2) DEFAULT 0,
    radiology_charge DECIMAL(10,2) DEFAULT 0,
    ot_charge DECIMAL(10,2) DEFAULT 0,
    procedure_charge DECIMAL(10,2) DEFAULT 0,
    medicine_charge DECIMAL(10,2) DEFAULT 0,
    nursing_charge DECIMAL(10,2) DEFAULT 0,
    service_charge DECIMAL(10,2) DEFAULT 0,
    food_charge DECIMAL(10,2) DEFAULT 0,
    misc_charge DECIMAL(10,2) DEFAULT 0,
    gross_total DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) DEFAULT 0,
    advance_adjusted DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    due_amount DECIMAL(10,2) DEFAULT 0,
    status ENUM('Draft','Discharged','Paid','Partial','Cancelled') DEFAULT 'Draft',
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- Lab ----------
CREATE TABLE lab_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    test_name VARCHAR(150) NOT NULL,
    status ENUM('Pending','Completed','Cancelled') DEFAULT 'Pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ---------- Billing Modifications / Cancellations / Refunds ----------
CREATE TABLE billing_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_type ENUM('OP','IP') NOT NULL,
    bill_id INT NOT NULL,
    action_type ENUM(
        'Consultation_Cancel','Bill_Cancel','Lab_Cancel','Lab_Modify',
        'Service_Cancel','Procedure_Cancel','Surgery_Cancel',
        'Admission_Cancel','Advance_Refund','Advance_Adjustment','Reprint'
    ) NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0,
    reason TEXT,
    performed_by INT,
    approved_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- Audit Log ----------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(150) NOT NULL,
    module VARCHAR(80) NOT NULL,
    reference_id INT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- Seed data
-- ============================================
INSERT INTO departments (name) VALUES ('General Medicine'),('Cardiology'),('Orthopedics'),('Pediatrics'),('Gynecology');

INSERT INTO doctors (name, department_id, consultation_fee, phone) VALUES
('Dr. Rao', 1, 300, '9000000001'),
('Dr. Sharma', 2, 600, '9000000002'),
('Dr. Iyer', 3, 400, '9000000003'),
('Dr. Kumar', 4, 350, '9000000004');

INSERT INTO wards (name) VALUES ('General Ward'),('ICU'),('Maternity Ward');
INSERT INTO rooms (ward_id, room_no, room_type, rate_per_day) VALUES
(1,'G-101','General',800),
(1,'G-102','General',800),
(2,'ICU-01','ICU',3500),
(3,'M-201','Semi-Private',1500);
INSERT INTO beds (room_id, bed_no, status) VALUES
(1,'A','Available'),(1,'B','Available'),
(2,'A','Available'),
(3,'A','Available'),
(4,'A','Available');

-- Default super admin (password: Admin@123 -> replace hash by running the app's /auth/register once)
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Super Admin','admin@hms.com','<bcrypt-hash>','super_admin');
