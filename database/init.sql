-- VierDeVrijdag: initial schema for MariaDB / MySQL Workbench
-- 1) CREATE DATABASE IF NOT EXISTS vierdevrijdag CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 2) USE vierdevrijdag;
-- 3) Run this script.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `program_items`;
DROP TABLE IF EXISTS `meeting_tracks`;
DROP TABLE IF EXISTS `meetings`;
DROP TABLE IF EXISTS `posters`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES
('admin', '$2a$10$sY4mvUwEV4owEtdixUoJue6MiIgP2/FLImosv5OlUyJa1ikrLi0IG', 'ADMIN')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `role` = VALUES(`role`);

CREATE TABLE `posters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(64) NOT NULL,
  `template_rel_path` VARCHAR(512) NOT NULL DEFAULT 'template.png',
  `title_region` JSON NULL,
  `program_region` JSON NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE KEY `posters_slug_key` (`slug`),
  KEY `posters_sort_order_idx` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- JSON region columns: use string literals (not CAST(... AS JSON)) for MariaDB / older MySQL where CAST AS JSON can error 1064.
INSERT INTO `posters` (`id`, `name`, `slug`, `template_rel_path`, `title_region`, `program_region`, `sort_order`, `created_at`, `updated_at`) VALUES
(
  1,
  'Standaard',
  'standaard',
  'template.png',
  '{"x":0,"y":0.01883320542756681,"w":0.9978939450389646,"h":0.08292724497143042}',
  '{"x":0.04921210992207099,"y":0.8332549275331053,"w":0.9036818351168935,"h":0.1526201190041256}',
  0,
  '2026-04-28 16:14:31',
  '2026-04-28 14:21:25'
),
(
  2,
  'Robot-Juggler',
  'robot-juggler',
  'template2.png',
  '{"x":0,"y":0.017656315568611,"w":1,"h":0.08410407840217864}',
  '{"x":0.0197126532727508,"y":0.8270834291548816,"w":0.9542526799232531,"h":0.1632133489492822}',
  0,
  '2026-04-28 16:12:31',
  '2026-04-28 14:28:22'
),
(
  3,
  'VR-Lady',
  'vrlady',
  'template3.png',
  '{"x":0,"y":0.02648421859376045,"w":1,"h":0.0764533244316926}',
  '{"x":0.04394704321619121,"y":0.8364996557963756,"w":0.9131588703514264,"h":0.1508544899428609}',
  0,
  '2026-04-28 16:12:31',
  '2026-04-28 14:27:53'
),
(
  4,
  'Sphere-Lady',
  'spherelady',
  'template4.png',
  '{"x":0,"y":0.02648421859376045,"w":1,"h":0.0764533244316926}',
  '{"x":0.04394704321619121,"y":0.8364996557963756,"w":0.9131588703514264,"h":0.1508544899428609}',
  0,
  '2026-04-28 16:12:31',
  '2026-04-28 14:27:53'
),
(
  5,
  'Robot-Twin',
  'robot-twin',
  'template5.png',
  '{"x":0,"y":0.02648421859376045,"w":1,"h":0.0764533244316926}',
  '{"x":0.04394704321619121,"y":0.8364996557963756,"w":0.9131588703514264,"h":0.1508544899428609}',
  0,
  '2026-04-28 16:12:31',
  '2026-04-28 14:27:53'
),
(
  6,
  'Led-Santa',
  'led-santa',
  'template6.png',
  '{"x":0,"y":0.02648421859376045,"w":1,"h":0.0764533244316926}',
  '{"x":0.04394704321619121,"y":0.8364996557963756,"w":0.9131588703514264,"h":0.1508544899428609}',
  0,
  '2026-04-28 16:12:31',
  '2026-04-28 14:27:53'
)

CREATE TABLE `meetings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `meetup_date` DATE NOT NULL,
  `visible_from` DATE NOT NULL,
  `venue_line` VARCHAR(512) NOT NULL,
  `event_title` VARCHAR(255) NOT NULL DEFAULT 'VierDeVrijdag',
  `poster_id` INT NOT NULL DEFAULT 1,
  `poster_rel_path` VARCHAR(512) NULL,
  `is_template` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE KEY `meetings_meetup_date_key` (`meetup_date`),
  KEY `meetings_meetup_date_idx` (`meetup_date`),
  KEY `meetings_visible_from_idx` (`visible_from`),
  KEY `meetings_poster_id_idx` (`poster_id`),
  CONSTRAINT `meetings_poster_id_fkey` FOREIGN KEY (`poster_id`) REFERENCES `posters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meeting_tracks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `meeting_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  KEY `meeting_tracks_meeting_id_idx` (`meeting_id`),
  CONSTRAINT `meeting_tracks_meeting_id_fkey` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `program_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `meeting_id` INT NOT NULL,
  `track_id` INT NOT NULL,
  `slot_start` TIME(0) NOT NULL,
  `slot_end` TIME(0) NOT NULL,
  `description` TEXT NOT NULL,
  `speakers` VARCHAR(1024) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  KEY `program_items_meeting_id_idx` (`meeting_id`),
  KEY `program_items_track_id_idx` (`track_id`),
  CONSTRAINT `program_items_meeting_id_fkey` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `program_items_track_id_fkey` FOREIGN KEY (`track_id`) REFERENCES `meeting_tracks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
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

-- Dummy meetup (placeholder dates 2199-01-01 so it stays non-public / far future); poster template Standaard (id 1, slug standaard).
INSERT INTO `meetings` (
  `id`,
  `meetup_date`,
  `visible_from`,
  `venue_line`,
  `event_title`,
  `poster_id`,
  `poster_rel_path`,
  `is_template`,
  `created_at`,
  `updated_at`
) VALUES (
  1,
  '2199-01-01',
  '2199-01-01',
  'Wonders of Work Utrecht CS',
  'VierDeVrijdag',
  1,
  'generated/posters/20260501.jpg',
  1,
  '2026-04-28 11:43:04',
  '2026-04-28 14:28:22'
);

INSERT INTO `meeting_tracks` (
  `id`,
  `meeting_id`,
  `name`,
  `sort_order`,
  `created_at`,
  `updated_at`
) VALUES (
  1,
  1,
  'Hoofdprogramma',
  0,
  '2026-04-28 11:43:04',
  '2026-04-28 14:28:22'
);

INSERT INTO `program_items` (
  `id`,
  `meeting_id`,
  `track_id`,
  `slot_start`,
  `slot_end`,
  `description`,
  `speakers`,
  `sort_order`,
  `created_at`,
  `updated_at`
) VALUES
  (2, 1, 1, '19:30:00', '19:50:00', 'Tech op de zeepkist', NULL, 2, '2026-04-28 11:43:41', '2026-04-28 13:04:32'),
  (3, 1, 1, '19:00:00', '19:30:00', 'Inloop', NULL, 1, '2026-04-28 13:03:23', '2026-04-28 13:04:28'),
  (4, 1, 1, '19:50:00', '20:30:00', 'Mystery Guest #1', NULL, 3, '2026-04-28 13:05:02', '2026-04-28 13:05:02'),
  (5, 1, 1, '20:30:00', '21:10:00', 'Mystery Guest #2', NULL, 4, '2026-04-28 13:06:01', '2026-04-28 13:06:01'),
  (6, 1, 1, '21:10:00', '21:45:00', 'Netwerken en borrel', NULL, 5, '2026-04-28 13:06:23', '2026-04-28 13:08:37');

ALTER TABLE `meetings` AUTO_INCREMENT = 2;
ALTER TABLE `meeting_tracks` AUTO_INCREMENT = 2;
ALTER TABLE `program_items` AUTO_INCREMENT = 7;
