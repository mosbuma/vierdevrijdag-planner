import {
  nip05Identifier,
  parseEventHashtags,
  parseRelayList,
} from "@/lib/nostr/settings-schema";
import { getNostrSettings } from "@/lib/nostr/settings";

export async function getNostrRelays(): Promise<string[]> {
  const s = await getNostrSettings();
  const list = parseRelayList(s.relays);
  if (list.length === 0) {
    throw new Error("Minimaal één wss:// of ws:// relay vereist");
  }
  return list;
}

export async function getNostrProfileName(): Promise<string> {
  return (await getNostrSettings()).profile_name;
}

export async function getNostrProfileDisplayName(): Promise<string> {
  return (await getNostrSettings()).profile_display_name;
}

export async function getNostrProfileAbout(): Promise<string> {
  return (await getNostrSettings()).profile_about;
}

export async function getNostrProfilePictureUrl(): Promise<string | undefined> {
  const value = (await getNostrSettings()).profile_picture_url?.trim();
  return value || undefined;
}

export async function getNip05Domain(): Promise<string> {
  return (await getNostrSettings()).nip05_domain;
}

/** Public site origin for URLs embedded in published Nostr events (independent of NEXTAUTH_URL). */
export async function getNostrContentSiteOrigin(): Promise<string> {
  return (await getNostrSettings()).content_site_origin.replace(/\/$/, "");
}

export async function getNip05Identifier(): Promise<string> {
  const s = await getNostrSettings();
  return nip05Identifier(s.profile_name, s.nip05_domain);
}

export async function getNostrEventHashtags(): Promise<string[]> {
  return parseEventHashtags((await getNostrSettings()).event_hashtags);
}

export async function getNostrEventDTagPrefix(): Promise<string> {
  return (await getNostrSettings()).event_d_tag_prefix;
}

export async function getNostrCalendarCollectionDTag(): Promise<string> {
  return (await getNostrSettings()).calendar_collection_d_tag;
}

export async function getNostrCalendarCollectionTitle(): Promise<string> {
  return (await getNostrSettings()).calendar_collection_title;
}

export async function getNostrCalendarCollectionDescription(): Promise<string> {
  return (await getNostrSettings()).calendar_collection_description;
}

export async function getNostrTimezone(): Promise<string> {
  return (await getNostrSettings()).timezone;
}

export async function getNostrMeetupDefaultStart(): Promise<string> {
  return (await getNostrSettings()).meetup_default_start;
}

export async function getNostrMeetupDefaultEnd(): Promise<string> {
  return (await getNostrSettings()).meetup_default_end;
}

export async function getNostrDeletionReason(): Promise<string> {
  return (await getNostrSettings()).deletion_reason;
}
