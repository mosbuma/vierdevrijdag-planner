-- Add poster templates; move title/program regions from meetings to posters.
-- Run after existing DB has `meetings` with optional poster_title_region columns.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posters` (
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
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `template_rel_path` = VALUES(`template_rel_path`),
  `title_region` = VALUES(`title_region`),
  `program_region` = VALUES(`program_region`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = VALUES(`updated_at`);

ALTER TABLE `meetings`
  ADD COLUMN `poster_id` INT NOT NULL DEFAULT 1 AFTER `event_title`;

ALTER TABLE `meetings`
  ADD CONSTRAINT `meetings_poster_id_fkey` FOREIGN KEY (`poster_id`) REFERENCES `posters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `meetings`
  DROP COLUMN `poster_title_region`,
  DROP COLUMN `poster_program_region`;
