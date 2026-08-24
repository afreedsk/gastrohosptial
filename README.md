CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('SuperAdmin','IT','PCM','MedTech','Caredx','Corporate','Adminstrationfunctionalunit','ResearchDevelopment') NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
);

CREATE TABLE `finance_entry_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `finance_entry_id` int NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `quantity` decimal(12,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(14,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `finance_entry_id` (`finance_entry_id`),
  CONSTRAINT `finance_entry_items_ibfk_1` FOREIGN KEY (`finance_entry_id`) REFERENCES `finance_entries` (`id`) ON DELETE CASCADE
);

CREATE TABLE `finance_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department` enum('IT','PCM','MedTech','Caredx','Corporate','Adminstrationfunctionalunit','ResearchDevelopment') NOT NULL,
  `entry_type` enum('Income','Expenses') NOT NULL,
  `category` varchar(60) NOT NULL,
  `generated_by` varchar(120) DEFAULT NULL,
  `revenue_type` varchar(50) DEFAULT NULL,
  `patient_name` varchar(150) DEFAULT NULL,
  `patient_place` varchar(150) DEFAULT NULL,
  `client_name` varchar(150) DEFAULT NULL,
  `gst_number` varchar(20) DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `base_amount` decimal(14,2) DEFAULT NULL,
  `gst_tax_percent` decimal(5,2) DEFAULT NULL,
  `gst_tax_amount` decimal(14,2) DEFAULT '0.00',
  `remarks` text,
  `entry_date` date NOT NULL,
  `created_by_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `invoice_filename` varchar(255) DEFAULT NULL,
  `invoice_original_name` varchar(255) DEFAULT NULL,
  `invoice_mimetype` varchar(100) DEFAULT NULL,
  `tax_invoice_number` varchar(50) DEFAULT NULL,
  `sub_category` varchar(60) DEFAULT NULL,
  `exec_department` varchar(50) DEFAULT NULL,
  `employee_name` varchar(150) DEFAULT NULL,
  `salary_amount` decimal(14,2) DEFAULT NULL,
  `allowance_amount` decimal(14,2) DEFAULT NULL,
  `extra_data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by_id` (`created_by_id`),
  CONSTRAINT `finance_entries_ibfk_1` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
);


CREATE TABLE `caredx_lab_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_date` date NOT NULL,
  `patient_name` varchar(150) NOT NULL,
  `test_name` varchar(255) NOT NULL,
  `total_amount_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
  `employee_name` varchar(150) DEFAULT NULL,
  `cash` decimal(14,2) NOT NULL DEFAULT '0.00',
  `online` decimal(14,2) NOT NULL DEFAULT '0.00',
  `paid_to_other_labs` decimal(14,2) NOT NULL DEFAULT '0.00',
  `rmp` decimal(14,2) NOT NULL DEFAULT '0.00',
  `salaries_expense` decimal(14,2) NOT NULL DEFAULT '0.00',
  `expense_details` text,
  `referral_by` varchar(150) DEFAULT NULL,
  `referral_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `sales` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_by_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by_id` (`created_by_id`),
  CONSTRAINT `caredx_lab_entries_ibfk_1` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
);

CREATE TABLE `caredx_expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expense_date` date NOT NULL,
  `category` varchar(150) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `remarks` text,
  `created_by_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by_id` (`created_by_id`),
  CONSTRAINT `caredx_expenses_ibfk_1` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
);

