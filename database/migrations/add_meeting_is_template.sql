-- Add template flag for bootstrapped / blueprint meetup (not shown on public event page).
ALTER TABLE `meetings`
  ADD COLUMN `is_template` TINYINT(1) NOT NULL DEFAULT 0 AFTER `poster_rel_path`;

-- Optional: mark the bootstrapped placeholder (init.sql id 1, date 2199-01-01) as template.
UPDATE `meetings` SET `is_template` = 1 WHERE `meetup_date` = '2199-01-01' LIMIT 1;
