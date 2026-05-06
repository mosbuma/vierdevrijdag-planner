-- Rich text per program row (public event page / {program} metatag).
ALTER TABLE `program_items`
  ADD COLUMN `row_description_html` LONGTEXT NULL AFTER `description`;
