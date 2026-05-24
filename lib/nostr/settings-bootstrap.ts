import type { NostrSettingsInput } from "@/lib/nostr/settings-schema";

/** Default row when `nostr_settings` is empty (matches production DB as of 2026-05-24). */
export const DEFAULT_NOSTR_SETTINGS: NostrSettingsInput = {
  relays:
    "wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://relay.snort.social,wss://nostr.wine",
  nip05_domain: "vierdevrijdag.org",
  content_site_origin: "https://vierdevrijdag.org",
  profile_name: "meetup",
  profile_display_name: "VierDeVrijdag",
  profile_picture_url: null,
  profile_about:
    "Maandelijkse VierDeVrijdag meetup, vierde vrijdag van de maand bij Wonders Of Work in Utrecht.",
  event_hashtags: "vierdevrijdag,meetup,utrecht",
  event_d_tag_prefix: "vierdevrijdag",
  calendar_collection_d_tag: "vierdevrijdag",
  calendar_collection_title: "VierDeVrijdag",
  calendar_collection_description:
    "Maandelijkse VierDeVrijdag meetup, vierde vrijdag van de maand bij Wonders Of Work in Utrecht.",
  timezone: "Europe/Amsterdam",
  meetup_default_start: "19:00",
  meetup_default_end: "21:30",
  deletion_reason: "Meetup deleted by admin",
};
