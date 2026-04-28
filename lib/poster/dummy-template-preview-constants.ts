/** Safe to import from client components (no Node/sharp). */

/** Select value for the hard-coded dummy meetup when the DB has no meetings. */
export const TEMPLATE_EDITOR_DUMMY_MEETING_ID = -1;

/** JPEG path under `public/` for the poster template editor preview for this template id. */
export function templateEditorPreviewRelPath(posterTemplateId: number): string {
  return `generated/posters/template-preview-${posterTemplateId}.jpg`;
}

/**
 * Hard-coded sample meetup used only for poster template preview (not in the database).
 * Order: id, meetup_date, visible_from, venue_line, event_title, poster_id, poster_rel_path, created_at, updated_at
 */
export const POSTER_TEMPLATE_DUMMY_MEETUP = {
  id: 1,
  meetup_date: "2199-01-01",
  visible_from: "2199-01-01",
  venue_line: "Wonders of Work Utrecht CS",
  event_title: "VierDeVrijdag",
  poster_id: 1,
  poster_rel_path: "generated/posters/20260501.jpg",
  created_at: "2026-04-28 11:43:04",
  updated_at: "2026-04-28 14:28:22",
} as const;
