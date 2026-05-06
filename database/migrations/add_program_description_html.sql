-- Add rich-text program description for public event page (run on existing DBs).

ALTER TABLE `meetings`
  ADD COLUMN `program_description_html` LONGTEXT NULL AFTER `poster_rel_path`;
