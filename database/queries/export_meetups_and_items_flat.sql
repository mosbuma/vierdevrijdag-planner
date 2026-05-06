-- Flat export: one row per programma-item; meetups without items appear once (item columns NULL).
-- MySQL Workbench: run query → Result Grid → right-click → Export resultset → CSV/JSON/…
--
-- Optional: restrict to one meetup
--   AND m.id = 1

SELECT
  m.id AS meeting_id,
  DATE_FORMAT(m.meetup_date, '%Y-%m-%d') AS meetup_date,
  DATE_FORMAT(m.visible_from, '%Y-%m-%d') AS visible_from,
  m.venue_line,
  m.event_title,
  m.poster_id,
  p.slug AS poster_slug,
  p.name AS poster_name,
  m.poster_rel_path,
  m.is_template,
  m.created_at AS meeting_created_at,
  m.updated_at AS meeting_updated_at,
  pi.id AS program_item_id,
  pi.track_id,
  t.name AS track_name,
  TIME_FORMAT(pi.slot_start, '%H:%i') AS slot_start,
  TIME_FORMAT(pi.slot_end, '%H:%i') AS slot_end,
  pi.description,
  pi.row_description_html,
  pi.speakers,
  pi.sort_order AS item_sort_order,
  pi.created_at AS item_created_at,
  pi.updated_at AS item_updated_at
FROM meetings m
LEFT JOIN posters p ON p.id = m.poster_id
LEFT JOIN program_items pi ON pi.meeting_id = m.id
LEFT JOIN meeting_tracks t ON t.id = pi.track_id
ORDER BY m.meetup_date DESC, m.id ASC, pi.sort_order ASC, pi.id ASC;
