-- Add Nostr publication tracking to meetings (run once on existing databases).
ALTER TABLE `meetings`
  ADD COLUMN `nostr_event_id` CHAR(64) NULL AFTER `is_template`,
  ADD COLUMN `nostr_d_tag` VARCHAR(128) NULL AFTER `nostr_event_id`,
  ADD COLUMN `nostr_published_at` DATETIME(0) NULL AFTER `nostr_d_tag`,
  ADD COLUMN `nostr_last_error` VARCHAR(1024) NULL AFTER `nostr_published_at`;
