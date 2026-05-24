function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getNostrRelays(): string[] {
  const list = requireEnv("NOSTR_RELAYS")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("wss://") || r.startsWith("ws://"));
  if (list.length === 0) {
    throw new Error("NOSTR_RELAYS must contain at least one wss:// or ws:// URL");
  }
  return list;
}

export function getNostrProfileName(): string {
  return requireEnv("NOSTR_PROFILE_NAME");
}

export function getNostrProfileDisplayName(): string {
  return requireEnv("NOSTR_PROFILE_DISPLAY_NAME");
}

export function getNostrProfileAbout(): string {
  return requireEnv("NOSTR_PROFILE_ABOUT");
}

export function getNostrProfilePictureUrl(): string | undefined {
  const value = process.env.NOSTR_PROFILE_PICTURE_URL?.trim();
  return value || undefined;
}

export function getNip05Domain(): string {
  return requireEnv("NOSTR_NIP05_DOMAIN").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getNip05Identifier(): string {
  return `${getNostrProfileName()}@${getNip05Domain()}`;
}

export function getNostrEventHashtags(): string[] {
  if (process.env.NOSTR_EVENT_HASHTAGS === undefined) {
    throw new Error("NOSTR_EVENT_HASHTAGS is not configured");
  }
  const raw = process.env.NOSTR_EVENT_HASHTAGS.trim();
  if (raw === "") return [];

  const tags = raw
    .split(",")
    .map((t) => t.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);

  return [...new Set(tags)];
}

export function getNostrEventDTagPrefix(): string {
  return requireEnv("NOSTR_EVENT_D_TAG_PREFIX");
}

export function getNostrCalendarCollectionDTag(): string {
  return requireEnv("NOSTR_CALENDAR_COLLECTION_D_TAG");
}

export function getNostrCalendarCollectionTitle(): string {
  return requireEnv("NOSTR_CALENDAR_COLLECTION_TITLE");
}

export function getNostrCalendarCollectionDescription(): string {
  return requireEnv("NOSTR_CALENDAR_COLLECTION_DESCRIPTION");
}

export function getNostrTimezone(): string {
  return requireEnv("NOSTR_TIMEZONE");
}

export function getNostrMeetupDefaultStart(): string {
  return requireEnv("NOSTR_MEETUP_DEFAULT_START");
}

export function getNostrMeetupDefaultEnd(): string {
  return requireEnv("NOSTR_MEETUP_DEFAULT_END");
}

export function getNostrDeletionReason(): string {
  return requireEnv("NOSTR_DELETION_REASON");
}
