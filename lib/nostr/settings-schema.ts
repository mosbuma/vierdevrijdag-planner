import { z } from "zod";

const relayListSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (raw) => {
      const list = raw
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.startsWith("wss://") || r.startsWith("ws://"));
      return list.length > 0;
    },
    { message: "Minimaal één wss:// of ws:// relay vereist" },
  );

const timeSchema = z.string().trim().regex(/^\d{2}:\d{2}$/, "Gebruik HH:mm");

export const nostrSettingsInputSchema = z.object({
  relays: relayListSchema,
  nip05_domain: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/$/, "")),
  content_site_origin: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .transform((v) => {
      let origin = v.replace(/\/$/, "");
      if (!/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
      return origin;
    }),
  profile_name: z.string().trim().min(1).max(64),
  profile_display_name: z.string().trim().min(1).max(128),
  profile_picture_url: z
    .string()
    .trim()
    .max(512)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  profile_about: z.string().trim().min(1),
  event_hashtags: z.string().trim().max(512).default(""),
  event_d_tag_prefix: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/i, "Alleen letters, cijfers en streepjes"),
  calendar_collection_d_tag: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9-]+$/i, "Alleen letters, cijfers en streepjes"),
  calendar_collection_title: z.string().trim().min(1).max(255),
  calendar_collection_description: z.string().trim().min(1),
  timezone: z.string().trim().min(1).max(64),
  meetup_default_start: timeSchema,
  meetup_default_end: timeSchema,
  deletion_reason: z.string().trim().min(1).max(512),
});

export type NostrSettingsInput = z.infer<typeof nostrSettingsInputSchema>;

export function parseRelayList(raw: string): string[] {
  return raw
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("wss://") || r.startsWith("ws://"));
}

export function parseEventHashtags(raw: string): string[] {
  if (!raw.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function nip05Identifier(profileName: string, nip05Domain: string): string {
  return `${profileName}@${nip05Domain}`;
}
