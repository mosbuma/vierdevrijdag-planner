import { dayBucketsForRange } from "@/lib/nostr/local-unix";

export const NOSTR_KIND = {
  METADATA: 0,
  DELETION: 5,
  TIME_BASED_CALENDAR_EVENT: 31923,
  CALENDAR: 31924,
} as const;

export type AppNostrKind = (typeof NOSTR_KIND)[keyof typeof NOSTR_KIND];

export const APP_NOSTR_KIND_FILTERS: ReadonlyArray<{
  kind: AppNostrKind;
  label: string;
  defaultEnabled: boolean;
}> = [
  { kind: NOSTR_KIND.TIME_BASED_CALENDAR_EVENT, label: "Kalender-events", defaultEnabled: true },
  { kind: NOSTR_KIND.CALENDAR, label: "Kalender-collectie", defaultEnabled: true },
  { kind: NOSTR_KIND.METADATA, label: "Profiel", defaultEnabled: false },
  { kind: NOSTR_KIND.DELETION, label: "Verwijderverzoeken", defaultEnabled: false },
];

const APP_NOSTR_KINDS = new Set<number>(APP_NOSTR_KIND_FILTERS.map((f) => f.kind));

/** Kinds fetched from relays for this app (profile, calendar, deletions). */
export const APP_NOSTR_KIND_LIST: AppNostrKind[] = APP_NOSTR_KIND_FILTERS.map((f) => f.kind);

export function isAppNostrKind(kind: number): kind is AppNostrKind {
  return APP_NOSTR_KINDS.has(kind);
}

export type NostrTag = string[];

export type UnsignedNostrEvent = {
  kind: number;
  created_at: number;
  tags: NostrTag[];
  content: string;
};

export type TimeBasedCalendarEventInput = {
  identifier: string;
  title: string;
  description?: string;
  summary?: string;
  startUnix: number;
  endUnix?: number;
  timezone?: string;
  location?: string;
  image?: string;
  hashtags?: string[];
};

export type CalendarCollectionInput = {
  identifier: string;
  title: string;
  description?: string;
  eventRefs: { dTag: string; relayHint?: string }[];
  authorPubkey: string;
};

export function buildTimeBasedCalendarEvent(input: TimeBasedCalendarEventInput): UnsignedNostrEvent {
  if (!input.timezone?.trim()) {
    throw new Error("timezone is required for time-based calendar events");
  }
  const tz = input.timezone.trim();
  const tags: NostrTag[] = [
    ["d", input.identifier],
    ["title", input.title],
    ["start", String(input.startUnix)],
    ["start_tzid", tz],
  ];

  const endUnix = input.endUnix ?? input.startUnix + 3600;
  tags.push(["end", String(endUnix)], ["end_tzid", tz]);

  for (const day of dayBucketsForRange(input.startUnix, endUnix)) {
    tags.push(["D", day]);
  }

  if (input.summary) tags.push(["summary", input.summary]);
  if (input.location) tags.push(["location", input.location]);
  if (input.image) tags.push(["image", input.image]);
  for (const tag of input.hashtags ?? []) {
    tags.push(["t", tag.replace(/^#/, "")]);
  }

  return {
    kind: NOSTR_KIND.TIME_BASED_CALENDAR_EVENT,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: input.description ?? "",
  };
}

export function buildCalendarCollection(input: CalendarCollectionInput): UnsignedNostrEvent {
  const tags: NostrTag[] = [
    ["d", input.identifier],
    ["title", input.title],
  ];
  for (const ref of input.eventRefs) {
    const addr = `${NOSTR_KIND.TIME_BASED_CALENDAR_EVENT}:${input.authorPubkey}:${ref.dTag}`;
    if (ref.relayHint) {
      tags.push(["a", addr, ref.relayHint]);
    } else {
      tags.push(["a", addr]);
    }
  }
  return {
    kind: NOSTR_KIND.CALENDAR,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: input.description ?? "",
  };
}

export type ProfileEventInput = {
  name: string;
  displayName: string;
  about: string;
  picture?: string;
  nip05: string;
};

export function buildProfileEvent(input: ProfileEventInput): UnsignedNostrEvent {
  const profile: Record<string, string> = {
    name: input.name,
    display_name: input.displayName,
    about: input.about,
    nip05: input.nip05,
  };
  if (input.picture) profile.picture = input.picture;
  return {
    kind: NOSTR_KIND.METADATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(profile),
  };
}

export function buildDeletionRequest(opts: {
  eventId: string;
  kind: number;
  pubkey: string;
  dTag?: string | null;
  reason?: string;
}): UnsignedNostrEvent {
  const tags: NostrTag[] = [
    ["e", opts.eventId],
    ["k", String(opts.kind)],
  ];
  if (opts.dTag) {
    tags.push(["a", `${opts.kind}:${opts.pubkey}:${opts.dTag}`]);
  }
  return {
    kind: NOSTR_KIND.DELETION,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: opts.reason ?? "",
  };
}
