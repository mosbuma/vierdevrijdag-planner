import { z } from "zod";
import { posterNormRectSchema } from "@/lib/poster/poster-regions";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmm = z.string().regex(/^\d{1,2}:\d{2}$/);

export const patchMeetingSchema = z.object({
  meetup_date: ymd.optional(),
  visible_from: ymd.optional(),
  venue_line: z.string().min(1).max(512).optional(),
  event_title: z.string().min(1).max(255).optional(),
  poster_id: z.number().int().positive().optional(),
  /** HTML from TipTap; stored only after sanitization on the server. */
  program_description_html: z.union([z.string().max(200_000), z.null()]).optional(),
});

/** `meetingId` −1 = dummy meetup; else a real `meetings.id`. */
export const posterTemplatePreviewSchema = z.object({
  meetingId: z.number().int().refine((id) => id === -1 || id > 0, { message: "Ongeldige meetup" }),
});

export const patchPosterSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  slug: z.string().min(1).max(64).optional(),
  template_rel_path: z.string().min(1).max(512).optional(),
  title_region: posterNormRectSchema.optional(),
  program_region: posterNormRectSchema.optional(),
  sort_order: z.number().int().optional(),
});

export const createProgramItemSchema = z.object({
  track_id: z.number().int().positive(),
  slot_start: hhmm,
  slot_end: hhmm,
  description: z.string().min(1),
  /** TipTap HTML; stored after server sanitization. */
  row_description_html: z.union([z.string().max(50_000), z.null()]).optional(),
  speakers: z.string().max(1024).optional().nullable(),
  sort_order: z.number().int().optional(),
});

export const patchProgramItemSchema = createProgramItemSchema.partial();

export const patchMeetingTrackSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().optional(),
});

export const createUserSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(6).max(200),
  role: z.enum(["USER", "ADMIN"]),
});

export const patchUserSchema = z.object({
  password: z.string().min(6).max(200).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});
