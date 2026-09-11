CREATE TABLE `admissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admission_no` varchar(20) NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int DEFAULT NULL,
  `ward_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `bed_id` int DEFAULT NULL,
  `admission_date` date NOT NULL,
  `admission_time` time DEFAULT NULL,
  `reason` text,
  `diagnosis` text,
  `advance_amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('Admitted','Discharged','Cancelled','Transferred') DEFAULT 'Admitted',
  `discharge_date` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admission_no` (`admission_no`),
  KEY `patient_id` (`patient_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `ward_id` (`ward_id`),
  KEY `room_id` (`room_id`),
  KEY `bed_id` (`bed_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `admissions_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admissions_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admissions_ibfk_3` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admissions_ibfk_4` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admissions_ibfk_5` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admissions_ibfk_6` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `advance_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_registration_id` int NOT NULL,
  `entry_type` enum('Payment','Refund') DEFAULT 'Payment',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_mode` enum('Cash','Card','UPI','Insurance','Credit') DEFAULT 'Cash',
  `remarks` varchar(255) DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ip_registration_id` (`ip_registration_id`),
  KEY `received_by` (`received_by`),
  CONSTRAINT `advance_payments_ibfk_1` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `advance_payments_ibfk_2` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appointment_no` varchar(20) NOT NULL,
  `patient_id` int NOT NULL,
  `department_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `time_slot` varchar(20) DEFAULT NULL,
  `token_no` int DEFAULT NULL,
  `consultation_fee` decimal(10,2) DEFAULT '0.00',
  `visit_type` enum('New','Follow-up','Emergency') DEFAULT 'New',
  `status` enum('Booked','Completed','Cancelled','Rescheduled') DEFAULT 'Booked',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_no` (`appointment_no`),
  KEY `patient_id` (`patient_id`),
  KEY `department_id` (`department_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(150) NOT NULL,
  `module` varchar(80) NOT NULL,
  `reference_id` int DEFAULT NULL,
  `reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `beds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `bed_no` varchar(10) NOT NULL,
  `status` enum('Available','Occupied','Maintenance') DEFAULT 'Available',
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `beds_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `billing_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_type` enum('OP','IP') NOT NULL,
  `bill_id` int NOT NULL,
  `action_type` enum('Consultation_Cancel','Bill_Cancel','Lab_Cancel','Lab_Modify','Service_Cancel','Procedure_Cancel','Surgery_Cancel','Admission_Cancel','Advance_Refund','Advance_Adjustment','Reprint') NOT NULL,
  `amount` decimal(10,2) DEFAULT '0.00',
  `reason` text,
  `performed_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `performed_by` (`performed_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `billing_actions_ibfk_1` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_actions_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `discharge_summaries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_registration_id` int NOT NULL,
  `surgery_date` date DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `department` varchar(120) DEFAULT NULL,
  `diagnosis` text,
  `procedure` text,
  `complaint` text,
  `past_history` text,
  `drug_history` text,
  `surgical_history` text,
  `examination` json DEFAULT NULL,
  `investigations` text,
  `course_hospitalization` text,
  `condition_discharge` text,
  `discharge_advise` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ip_registration_id` (`ip_registration_id`),
  KEY `doctor_id` (`doctor_id`),
  CONSTRAINT `discharge_summaries_ibfk_1` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `discharge_summaries_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `department_id` int DEFAULT NULL,
  `consultation_fee` decimal(10,2) DEFAULT '0.00',
  `phone` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `max_bookings_per_day` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `signature` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `doctor_description` text,
  `ip_doctor_fee` decimal(10,2) DEFAULT '0.00',
  `op_doctor_fee` decimal(10,2) DEFAULT '0.00',
  `op_valid_for` int DEFAULT '0',
  `op_visits` int DEFAULT '0',
  `emergency_consultation_fee` decimal(10,2) DEFAULT '0.00',
  `surgeon_fee` decimal(10,2) DEFAULT '0.00',
  `ip_consultation_fee` decimal(10,2) DEFAULT '0.00',
  `op_consultation_fee` decimal(10,2) DEFAULT '0.00',
  `specialization` varchar(200) DEFAULT NULL,
  `address` text,
  `email` varchar(100) DEFAULT NULL,
  `emergency_phone` varchar(15) DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `doctors_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=222 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `grn` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grn_no` varchar(50) NOT NULL,
  `grn_date` date NOT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `supplier_mobile` varchar(15) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `status` enum('Draft','Received','Approved','Returned') DEFAULT 'Draft',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grn_no` (`grn_no`),
  KEY `supplier_id` (`supplier_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `grn_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `grn_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `grn_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grn_id` int NOT NULL,
  `item_id` int NOT NULL,
  `batch_no` varchar(50) DEFAULT NULL,
  `exp_date` date DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT '0.00',
  `mrp` decimal(10,2) DEFAULT '0.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `eff_rate` decimal(10,2) DEFAULT '0.00',
  `tax_percent` decimal(5,2) DEFAULT '0.00',
  `amount` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `grn_id` (`grn_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `grn_items_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grn` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grn_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `pharmacy_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `import_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) DEFAULT NULL,
  `import_type` varchar(30) DEFAULT 'opd_bills',
  `total_rows` int DEFAULT '0',
  `processed_rows` int DEFAULT '0',
  `inserted_rows` int DEFAULT '0',
  `updated_rows` int DEFAULT '0',
  `failed_rows` int DEFAULT '0',
  `status` enum('Queued','Processing','Completed','Failed') DEFAULT 'Queued',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `import_errors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `row_no` int DEFAULT NULL,
  `error_message` text,
  `raw_data` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),CREATE TABLE `ip_bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_no` varchar(50) NOT NULL,
  `admission_id` int DEFAULT NULL,
  `ip_registration_id` int DEFAULT NULL,
  `admission_charge` decimal(10,2) DEFAULT '0.00',
  `room_charge` decimal(10,2) DEFAULT '0.00',
  `doctor_visit_charge` decimal(10,2) DEFAULT '0.00',
  `lab_charge` decimal(10,2) DEFAULT '0.00',
  `radiology_charge` decimal(10,2) DEFAULT '0.00',
  `ot_charge` decimal(10,2) DEFAULT '0.00',
  `procedure_charge` decimal(10,2) DEFAULT '0.00',
  `medicine_charge` decimal(10,2) DEFAULT '0.00',
  `nursing_charge` decimal(10,2) DEFAULT '0.00',
  `service_charge` decimal(10,2) DEFAULT '0.00',
  `food_charge` decimal(10,2) DEFAULT '0.00',
  `misc_charge` decimal(10,2) DEFAULT '0.00',
  `gross_total` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `grand_total` decimal(10,2) DEFAULT '0.00',
  `advance_adjusted` decimal(10,2) DEFAULT '0.00',
  `paid_amount` decimal(10,2) DEFAULT '0.00',
  `due_amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('Draft','Discharged','Paid','Partial','Cancelled') DEFAULT 'Draft',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bill_no` (`bill_no`),
  KEY `admission_id` (`admission_id`),
  KEY `created_by` (`created_by`),
  KEY `fk_ip_bills_registration` (`ip_registration_id`),
  CONSTRAINT `fk_ip_bills_registration` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ip_bills_ibfk_1` FOREIGN KEY (`admission_id`) REFERENCES `admissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ip_bills_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ip_lab` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_registration_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ip_registration_id` (`ip_registration_id`),
  CONSTRAINT `ip_lab_ibfk_1` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ip_lab_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_registration_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `test_name` varchar(200) NOT NULL,
  `result` varchar(500) DEFAULT NULL,
  `normal_range` varchar(200) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `performed_by` int DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `status` enum('Pending','In Progress','Completed','Verified') DEFAULT 'Pending',
  `report_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ip_registration_id` (`ip_registration_id`),
  KEY `patient_id` (`patient_id`),
  CONSTRAINT `ip_lab_results_ibfk_1` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`),
  CONSTRAINT `ip_lab_results_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ip_procedures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_registration_id` int NOT NULL,
  `procedure_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ip_registration_id` (`ip_registration_id`),
  CONSTRAINT `ip_procedures_ibfk_1` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ip_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `ip_reg_no` varchar(20) NOT NULL,
  `opd_reg_no` varchar(20) DEFAULT NULL,
  `title` varchar(10) DEFAULT NULL,
  `first_name` varchar(80) NOT NULL,
  `last_name` varchar(80) DEFAULT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `age` int DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `marital_status` enum('Single','Married','Widowed','Divorced') DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `aadhar_number` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) NOT NULL,
  `alt_phone` varchar(20) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `state` varchar(80) DEFAULT NULL,
  `city` varchar(80) DEFAULT NULL,
  `locality` varchar(120) DEFAULT NULL,
  `street_address` varchar(200) DEFAULT NULL,
  `village` varchar(120) DEFAULT NULL,
  `mandal` varchar(120) DEFAULT NULL,
  `district` varchar(80) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `guardian_name` varchar(120) DEFAULT NULL,
  `guardian_relation` varchar(50) DEFAULT NULL,
  `guardian_mobile` varchar(20) DEFAULT NULL,
  `mother_name` varchar(120) DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `symptoms` text,
  `floor` varchar(30) DEFAULT NULL,
  `room_type` enum('General','Semi-Private','Private','ICU','Deluxe','VIP') DEFAULT 'General',
  `room_no` varchar(20) DEFAULT NULL,
  `bed_no` varchar(10) DEFAULT NULL,
  `referral_type` enum('Walkin','Online','Doctor','Hospital User','Other','Camp','Ads','Friend/Family','Marketing') DEFAULT 'Walkin',
  `referral_doctor_name` varchar(200) DEFAULT NULL,
  `payment_mode` enum('Cash','UPI','Card','Cheque','NEFT','Credit') DEFAULT 'Cash',
  `advance_amount` decimal(10,2) DEFAULT '0.00',
  `booking_type` enum('Walk-in','Online','Phone') DEFAULT 'Walk-in',
  `abha_number` varchar(30) DEFAULT NULL,
  `admitted_date` date NOT NULL,
  `room_transfer_status` enum('None','Requested','Transferred') DEFAULT 'None',
  `requested_room_no` varchar(20) DEFAULT NULL,
  `requested_bed_no` varchar(10) DEFAULT NULL,
  `transfer_requested_at` datetime DEFAULT NULL,
  `status` enum('Admitted','Discharged','Cancelled') DEFAULT 'Admitted',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ip_reg_no` (`ip_reg_no`),
  KEY `patient_id` (`patient_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `ip_registrations_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ip_registrations_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ip_registrations_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ip_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_registration_id` int NOT NULL,
  `service_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ip_registration_id` (`ip_registration_id`),
  CONSTRAINT `ip_services_ibfk_1` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `lab_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department` varchar(120) NOT NULL,
  `investigation_name` varchar(200) NOT NULL,
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `lab_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(20) NOT NULL,
  `ip_registration_id` int DEFAULT NULL,
  `op_registration_id` int DEFAULT NULL,
  `patient_id` int NOT NULL,
  `test_name` varchar(150) NOT NULL,
  `status` enum('Pending','Completed','Cancelled') DEFAULT 'Pending',
  `ordered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_no` (`order_no`),
  KEY `ip_registration_id` (`ip_registration_id`),
  KEY `op_registration_id` (`op_registration_id`),
  KEY `patient_id` (`patient_id`),
  KEY `lab_orders_user_fk` (`created_by`),
  CONSTRAINT `lab_orders_ip_fk` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lab_orders_op_fk` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lab_orders_patient_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lab_orders_user_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `lab_test_attributes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_test_id` int NOT NULL,
  `attribute_name` varchar(255) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `normal_range` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_test_attribute` (`lab_test_id`),
  CONSTRAINT `lab_test_attributes_ibfk_1` FOREIGN KEY (`lab_test_id`) REFERENCES `lab_tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `lab_tests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_name` varchar(255) NOT NULL,
  `short_name` varchar(100) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(20) DEFAULT 'Pending',
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_test_name` (`test_name`)
) ENGINE=InnoDB AUTO_INCREMENT=304 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `op_bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_no` varchar(50) NOT NULL,
  `patient_id` int NOT NULL,
  `appointment_id` int DEFAULT NULL,
  `consultation_charge` decimal(10,2) DEFAULT '0.00',
  `lab_charge` decimal(10,2) DEFAULT '0.00',
  `procedure_charge` decimal(10,2) DEFAULT '0.00',
  `service_charge` decimal(10,2) DEFAULT '0.00',
  `pharmacy_charge` decimal(10,2) DEFAULT '0.00',
  `gross_total` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `net_total` decimal(10,2) DEFAULT '0.00',
  `paid_amount` decimal(10,2) DEFAULT '0.00',
  `due_amount` decimal(10,2) DEFAULT '0.00',
  `payment_mode` enum('Cash','Card','UPI','Insurance','Credit','Bank') DEFAULT 'Cash',
  `status` enum('Paid','Partial','Due','Cancelled') DEFAULT 'Paid',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `payment_split` json DEFAULT NULL,
  `referral_type` varchar(50) DEFAULT NULL,
  `referral_doctor_name` varchar(120) DEFAULT NULL,
  `mlc` tinyint(1) DEFAULT '0',
  `mlc_number` varchar(50) DEFAULT NULL,
  `remarks` text,
  `cash_amount` decimal(10,2) DEFAULT '0.00',
  `radiology_charge` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `bill_no` (`bill_no`),
  KEY `patient_id` (`patient_id`),
  KEY `appointment_id` (`appointment_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `op_bills_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `op_bills_ibfk_2` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `op_bills_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15326 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `op_lab` (
  `id` int NOT NULL AUTO_INCREMENT,
  `op_registration_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `op_registration_id` (`op_registration_id`),
  CONSTRAINT `op_lab_ibfk_1` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6725 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `op_lab_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `op_registration_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `test_name` varchar(200) NOT NULL,
  `result` varchar(500) DEFAULT NULL,
  `normal_range` varchar(200) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `performed_by` int DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `status` enum('Pending','In Progress','Completed','Verified') DEFAULT 'Pending',
  `report_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `op_registration_id` (`op_registration_id`),
  KEY `patient_id` (`patient_id`),
  CONSTRAINT `op_lab_results_ibfk_1` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`),
  CONSTRAINT `op_lab_results_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `op_procedures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `op_registration_id` int NOT NULL,
  `procedure_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `op_registration_id` (`op_registration_id`),
  CONSTRAINT `op_procedures_ibfk_1` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `op_radiology` (
  `id` int NOT NULL AUTO_INCREMENT,
  `op_registration_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `op_registration_id` (`op_registration_id`),
  CONSTRAINT `op_radiology_ibfk_1` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1416 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `op_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `opd_reg_no` varchar(20) NOT NULL,
  `token_no` int NOT NULL,
  `title` varchar(10) DEFAULT NULL,
  `first_name` varchar(80) NOT NULL,
  `last_name` varchar(80) DEFAULT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `dob` date DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `mobile` varchar(30) DEFAULT NULL,
  `alt_phone` varchar(20) DEFAULT NULL,
  `aadhar_number` varchar(20) DEFAULT NULL,
  `visit_type` enum('General','Emergency') DEFAULT 'General',
  `guardian_relation` varchar(50) DEFAULT NULL,
  `guardian_name` varchar(120) DEFAULT NULL,
  `guardian_mobile` varchar(20) DEFAULT NULL,
  `street_address` varchar(200) DEFAULT NULL,
  `village` varchar(120) DEFAULT NULL,
  `area` varchar(150) DEFAULT NULL,
  `mandal` varchar(120) DEFAULT NULL,
  `district` varchar(80) DEFAULT NULL,
  `state` varchar(80) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `consultation_fee` decimal(10,2) DEFAULT '0.00',
  `referral_type` enum('Walkin','Online','Doctor','Hospital User','Other','Camp','Ads','Friend/Family','Marketing') DEFAULT 'Walkin',
  `referral_doctor_name` varchar(120) DEFAULT NULL,
  `appointment_date` date DEFAULT NULL,
  `appointment_time` varchar(20) DEFAULT NULL,
  `payment_mode` enum('Cash','UPI','Card','Cheque','NEFT','Credit') DEFAULT 'Cash',
  `registration_fee` decimal(10,2) DEFAULT '0.00',
  `abha_number` varchar(30) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `mlc` tinyint(1) DEFAULT '0',
  `mlc_number` varchar(50) DEFAULT NULL,
  `booking_type` enum('Walk-in','Online','Phone') DEFAULT 'Walk-in',
  `status` enum('Booked','Completed','Cancelled') DEFAULT 'Booked',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `opd_reg_no` (`opd_reg_no`),
  KEY `patient_id` (`patient_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `op_registrations_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `op_registrations_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `op_registrations_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8962 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `op_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `op_registration_id` int NOT NULL,
  `service_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `op_registration_id` (`op_registration_id`),
  CONSTRAINT `op_services_ibfk_1` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ot_indents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `indent_date` date NOT NULL,
  `indent_raised_for` varchar(150) NOT NULL,
  `indent_provided_to` varchar(150) DEFAULT NULL,
  `item_details` text NOT NULL,
  `indent_return` enum('Pending','Returned','Not Applicable') DEFAULT 'Pending',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `ot_indents_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patient_indents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `medicine_details` text NOT NULL,
  `requested_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `requested_by` int DEFAULT NULL,
  `status` enum('Pending','Fulfilled','Cancelled') DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `requested_by` (`requested_by`),
  CONSTRAINT `patient_indents_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `patient_indents_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_uid` varchar(30) DEFAULT NULL,
  `reg_no` varchar(30) DEFAULT NULL,
  `name` varchar(120) NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `dob` date DEFAULT NULL,
  `age` int DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `height` decimal(5,2) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `alt_phone` varchar(20) DEFAULT NULL,
  `aadhar_number` varchar(20) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `marital_status` enum('Single','Married','Widowed','Divorced') DEFAULT NULL,
  `door_no` varchar(50) DEFAULT NULL,
  `street` varchar(120) DEFAULT NULL,
  `village` varchar(120) DEFAULT NULL,
  `mandal` varchar(120) DEFAULT NULL,
  `city` varchar(80) DEFAULT NULL,
  `district` varchar(80) DEFAULT NULL,
  `state` varchar(80) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `guardian_name` varchar(120) DEFAULT NULL,
  `guardian_relation` varchar(50) DEFAULT NULL,
  `guardian_phone` varchar(20) DEFAULT NULL,
  `allergies` text,
  `diabetes` tinyint(1) DEFAULT '0',
  `hypertension` tinyint(1) DEFAULT '0',
  `existing_diseases` text,
  `notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reg_no` (`reg_no`),
  UNIQUE KEY `patient_uid` (`patient_uid`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6067 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pharmacy_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `store_id` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `batch_no` varchar(50) DEFAULT NULL,
  `old_tax_percent` decimal(5,2) DEFAULT '0.00',
  `new_tax_percent` decimal(5,2) DEFAULT '0.00',
  `grn_id` varchar(50) DEFAULT NULL,
  `mrp` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock_qty` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `pharmacy_items_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `pharmacy_stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `pharmacy_sale_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sale_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `batch_no` varchar(50) DEFAULT NULL,
  `old_tax_percent` decimal(5,2) DEFAULT '0.00',
  `new_tax_percent` decimal(5,2) DEFAULT '0.00',
  `grn_id` varchar(50) DEFAULT NULL,
  `qty` int NOT NULL DEFAULT '1',
  `mrp` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `pharmacy_sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `pharmacy_sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pharmacy_sale_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `pharmacy_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pharmacy_sales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sale_no` varchar(20) NOT NULL,
  `sale_type` enum('IP','OP','Direct') NOT NULL,
  `patient_id` int DEFAULT NULL,
  `ip_registration_id` int DEFAULT NULL,
  `op_registration_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `store_id` int NOT NULL,
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) DEFAULT '0.00',
  `payment_mode` enum('Cash','Card','UPI','Insurance','Credit') DEFAULT 'Cash',
  `paid_amount` decimal(10,2) DEFAULT '0.00',
  `due_amount` decimal(10,2) DEFAULT '0.00',
  `remarks` varchar(255) DEFAULT NULL,
  `status` enum('Draft','Submitted') DEFAULT 'Submitted',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sale_no` (`sale_no`),
  KEY `patient_id` (`patient_id`),
  KEY `ip_registration_id` (`ip_registration_id`),
  KEY `op_registration_id` (`op_registration_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `store_id` (`store_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `pharmacy_sales_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pharmacy_sales_ibfk_2` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pharmacy_sales_ibfk_3` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pharmacy_sales_ibfk_4` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pharmacy_sales_ibfk_5` FOREIGN KEY (`store_id`) REFERENCES `pharmacy_stores` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `pharmacy_sales_ibfk_6` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pharmacy_stores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `procedure_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `procedure_type` varchar(150) NOT NULL,
  `procedure_name` varchar(255) NOT NULL,
  `description` text,
  `rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_procedure_type` (`procedure_type`),
  KEY `idx_procedure_name` (`procedure_name`)
) ENGINE=InnoDB AUTO_INCREMENT=115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `radiology_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(20) NOT NULL,
  `ip_registration_id` int DEFAULT NULL,
  `op_registration_id` int DEFAULT NULL,
  `patient_id` int NOT NULL,
  `scan_name` varchar(150) NOT NULL,
  `status` enum('Pending','Completed','Cancelled') DEFAULT 'Pending',
  `ordered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_no` (`order_no`),
  KEY `ip_registration_id` (`ip_registration_id`),
  KEY `op_registration_id` (`op_registration_id`),
  KEY `patient_id` (`patient_id`),
  KEY `radiology_orders_user_fk` (`created_by`),
  CONSTRAINT `radiology_orders_ip_fk` FOREIGN KEY (`ip_registration_id`) REFERENCES `ip_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `radiology_orders_op_fk` FOREIGN KEY (`op_registration_id`) REFERENCES `op_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `radiology_orders_patient_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `radiology_orders_user_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `referral_doctors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `hospital_name` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `room_transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admission_id` int NOT NULL,
  `from_room_id` int DEFAULT NULL,
  `to_room_id` int DEFAULT NULL,
  `from_bed_id` int DEFAULT NULL,
  `to_bed_id` int DEFAULT NULL,
  `transfer_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `reason` text,
  PRIMARY KEY (`id`),
  KEY `admission_id` (`admission_id`),
  CONSTRAINT `room_transfers_ibfk_1` FOREIGN KEY (`admission_id`) REFERENCES `admissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ward_id` int NOT NULL,
  `room_no` varchar(20) NOT NULL,
  `room_type` enum('General','Semi-Private','Private','ICU','Deluxe','VIP') DEFAULT 'General',
  `rate_per_day` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `ward_id` (`ward_id`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `service_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_type` varchar(120) NOT NULL,
  `service_name` varchar(200) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `charge_type` varchar(50) DEFAULT NULL,
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `stock_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adjustment_no` varchar(50) NOT NULL,
  `adjustment_date` date NOT NULL,
  `item_id` int NOT NULL,
  `batch_no` varchar(50) DEFAULT NULL,
  `exp_date` date DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `mrp` decimal(10,2) DEFAULT NULL,
  `rate` decimal(10,2) DEFAULT NULL,
  `eff_rate` decimal(10,2) DEFAULT NULL,
  `tax_percent` decimal(5,2) DEFAULT NULL,
  `grn_id` int DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `status` enum('Draft','Approved') DEFAULT 'Draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `adjustment_no` (`adjustment_no`),
  KEY `item_id` (`item_id`),
  KEY `grn_id` (`grn_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `stock_adjustments_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `pharmacy_items` (`id`),
  CONSTRAINT `stock_adjustments_ibfk_2` FOREIGN KEY (`grn_id`) REFERENCES `grn` (`id`),
  CONSTRAINT `stock_adjustments_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `stock_adjustments_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `inventory_type` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text,
  `gst_no` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `vat_no` varchar(50) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_no` varchar(15) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `fax` varchar(20) DEFAULT NULL,
  `alt_contact_no` varchar(15) DEFAULT NULL,
  `website` varchar(200) DEFAULT NULL,
  `remarks` text,
  `apgst_no` varchar(50) DEFAULT NULL,
  `cst_no` varchar(50) DEFAULT NULL,
  `dl_no` varchar(50) DEFAULT NULL,
  `pan_no` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_igst_tax` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','executive','pharmacy','doctor','lab_technician') NOT NULL DEFAULT 'executive',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `gender` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `user_belongs_to` varchar(100) DEFAULT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `permissions` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `wards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `import_errors_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `import_batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5957 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Todays 10/09/2026

ALTER TABLE `ip_bills`
  ADD COLUMN `payment_mode` ENUM('Cash','Card','UPI','Insurance','Credit','Bank')
      DEFAULT 'Cash' AFTER `due_amount`,
  ADD COLUMN `payment_split` JSON DEFAULT NULL AFTER `payment_mode`,
  ADD COLUMN `cash_amount` DECIMAL(10,2) DEFAULT 0.00 AFTER `payment_split`;
  




-- Disable safe-update mode for THIS SESSION only
SET SQL_SAFE_UPDATES = 0;

-- ---------- 1. Consultation + Registration --------------------------
UPDATE op_bills
SET consultation_charge = gross_total
WHERE status <> 'Cancelled'
  AND gross_total > 0
  AND (consultation_charge IS NULL OR consultation_charge = 0)
  AND (lab_charge          IS NULL OR lab_charge = 0)
  AND (radiology_charge    IS NULL OR radiology_charge = 0)
  AND (remarks LIKE '%Consultation%' OR remarks LIKE '%Registration%');

-- ---------- 2. Diagnosis → lab_charge -------------------------------
UPDATE op_bills
SET lab_charge = gross_total
WHERE status <> 'Cancelled'
  AND gross_total > 0
  AND (lab_charge          IS NULL OR lab_charge = 0)
  AND (radiology_charge    IS NULL OR radiology_charge = 0)
  AND (consultation_charge IS NULL OR consultation_charge = 0)
  AND remarks LIKE '%Diagnosis%';

-- ---------- 3. Radiology → radiology_charge -------------------------
UPDATE op_bills
SET radiology_charge = gross_total
WHERE status <> 'Cancelled'
  AND gross_total > 0
  AND (radiology_charge    IS NULL OR radiology_charge = 0)
  AND (lab_charge          IS NULL OR lab_charge = 0)
  AND (consultation_charge IS NULL OR consultation_charge = 0)
  AND remarks LIKE '%Radiology%';

-- ---------- 4. Empty remarks — route by bill_no prefix --------------
UPDATE op_bills
SET radiology_charge = gross_total
WHERE status <> 'Cancelled'
  AND gross_total > 0
  AND (radiology_charge    IS NULL OR radiology_charge = 0)
  AND (lab_charge          IS NULL OR lab_charge = 0)
  AND (consultation_charge IS NULL OR consultation_charge = 0)
  AND bill_no LIKE 'OPR%';

UPDATE op_bills
SET lab_charge = gross_total
WHERE status <> 'Cancelled'
  AND gross_total > 0
  AND (lab_charge          IS NULL OR lab_charge = 0)
  AND (radiology_charge    IS NULL OR radiology_charge = 0)
  AND (consultation_charge IS NULL OR consultation_charge = 0)
  AND bill_no LIKE 'IPD%';

-- ---------- 5. Any remaining fully-zero → consultation --------------
UPDATE op_bills
SET consultation_charge = gross_total
WHERE status <> 'Cancelled'
  AND gross_total > 0
  AND (consultation_charge IS NULL OR consultation_charge = 0)
  AND (lab_charge          IS NULL OR lab_charge = 0)
  AND (radiology_charge    IS NULL OR radiology_charge = 0)
  AND (procedure_charge    IS NULL OR procedure_charge = 0)
  AND (service_charge      IS NULL OR service_charge = 0)
  AND (pharmacy_charge     IS NULL OR pharmacy_charge = 0);

-- Re-enable safe-update mode for the rest of this session
SET SQL_SAFE_UPDATES = 1;

SELECT
  DATE(created_at) AS day,
  SUM(consultation_charge) AS consult,
  SUM(lab_charge)          AS lab,
  SUM(radiology_charge)    AS radiology,
  SUM(paid_amount)         AS paid
FROM op_bills
WHERE status <> 'Cancelled'
GROUP BY DATE(created_at)
ORDER BY day DESC
LIMIT 10;