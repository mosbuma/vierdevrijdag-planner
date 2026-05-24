import { cache } from "react";
import type { NostrSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  nostrSettingsInputSchema,
  type NostrSettingsInput,
} from "@/lib/nostr/settings-schema";
import { DEFAULT_NOSTR_SETTINGS } from "@/lib/nostr/settings-bootstrap";

const SETTINGS_ID = 1;

async function seedDefaultSettingsIfEmpty(): Promise<NostrSettings | null> {
  const existing = await prisma.nostrSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;

  const data = nostrSettingsInputSchema.parse(DEFAULT_NOSTR_SETTINGS);
  return prisma.nostrSettings.create({ data: { id: SETTINGS_ID, ...data } });
}

export const getNostrSettings = cache(async (): Promise<NostrSettings> => {
  let row = await prisma.nostrSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) {
    row = await seedDefaultSettingsIfEmpty();
  }
  if (!row) {
    throw new Error("Nostr-instellingen ontbreken. Vul ze in via Instellingen (admin).");
  }
  return row;
});

export async function getNostrSettingsOptional(): Promise<NostrSettings | null> {
  try {
    return await getNostrSettings();
  } catch {
    return null;
  }
}

export async function updateNostrSettings(input: NostrSettingsInput): Promise<NostrSettings> {
  const data = nostrSettingsInputSchema.parse(input);
  return prisma.nostrSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}

export function nostrSettingsToClient(row: NostrSettings) {
  return {
    relays: row.relays,
    nip05_domain: row.nip05_domain,
    content_site_origin: row.content_site_origin,
    profile_name: row.profile_name,
    profile_display_name: row.profile_display_name,
    profile_picture_url: row.profile_picture_url,
    profile_about: row.profile_about,
    event_hashtags: row.event_hashtags,
    event_d_tag_prefix: row.event_d_tag_prefix,
    calendar_collection_d_tag: row.calendar_collection_d_tag,
    calendar_collection_title: row.calendar_collection_title,
    calendar_collection_description: row.calendar_collection_description,
    timezone: row.timezone,
    meetup_default_start: row.meetup_default_start,
    meetup_default_end: row.meetup_default_end,
    deletion_reason: row.deletion_reason,
    updated_at: row.updated_at.toISOString(),
  };
}

export type NostrSettingsClient = ReturnType<typeof nostrSettingsToClient>;
