-- Add audit log table (run on existing DBs). Safe to run once.

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `username` VARCHAR(255) NOT NULL,
  `action` VARCHAR(128) NOT NULL,
  `subject` VARCHAR(255) NULL,
  `changes` JSON NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_created_at_idx` (`created_at`),
  KEY `audit_logs_username_idx` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
