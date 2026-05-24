import { SimplePool } from "nostr-tools/pool";
import type { Filter } from "nostr-tools/filter";
import type { Event } from "nostr-tools/core";
import { NOSTR_KIND } from "@/lib/nostr/event-builder";
import { getNostrTimezone } from "@/lib/nostr/config";
import { getRelays } from "@/lib/nostr/relays";
import { tryLoadServerPubkey } from "@/lib/nostr/keys";

const QUERY_TIMEOUT_MS = 10_000;
const MAX_AUTHOR_EVENTS = 500;

function authorEventFilter(pkHex: string): Filter {
  return { authors: [pkHex], limit: MAX_AUTHOR_EVENTS };
}

export type FetchAuthorEventsResult =
  | {
      ok: true;
      npub: string;
      pkHex: string;
      relays: string[];
      events: Event[];
      relayErrors: string[];
    }
  | { ok: false; error: string };

function dedupeAndSort(events: Event[]): Event[] {
  const byId = new Map<string, Event>();
  for (const ev of events) {
    const prev = byId.get(ev.id);
    if (!prev || ev.created_at >= prev.created_at) {
      byId.set(ev.id, ev);
    }
  }
  return [...byId.values()].sort((a, b) => b.created_at - a.created_at);
}

const D_TAG_QUERY_TIMEOUT_MS = 8_000;

/** Calendar meetup events on relays for one author d-tag (includes republish orphans). */
export async function findAuthorCalendarEventsByDTag(
  pkHex: string,
  dTag: string,
): Promise<Event[]> {
  const relays = await getRelays();
  const pool = new SimplePool();
  const collected: Event[] = [];

  try {
    await Promise.allSettled(
      relays.map(async (relay) => {
        try {
          const rows = await pool.querySync(
            [relay],
            {
              authors: [pkHex],
              kinds: [NOSTR_KIND.TIME_BASED_CALENDAR_EVENT],
              "#d": [dTag],
              limit: 20,
            },
            { maxWait: D_TAG_QUERY_TIMEOUT_MS },
          );
          collected.push(...rows);
        } catch {
          /* best-effort per relay */
        }
      }),
    );
  } finally {
    pool.close(relays);
  }

  return dedupeAndSort(collected);
}

export async function fetchAuthorEventsFromRelays(): Promise<FetchAuthorEventsResult> {
  // Server identity from NOSTR_NPUB / NOSTR_NSEC — fetch all events by that author.
  const key = tryLoadServerPubkey();
  if (!key) {
    return { ok: false, error: "NOSTR_NPUB or NOSTR_NSEC is not configured." };
  }

  const relays = await getRelays();
  const pool = new SimplePool();
  const relayErrors: string[] = [];
  const collected: Event[] = [];

  await Promise.allSettled(
    relays.map(async (relay) => {
      try {
        const rows = await pool.querySync([relay], authorEventFilter(key.pkHex), {
          maxWait: QUERY_TIMEOUT_MS,
        });
        collected.push(...rows);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        relayErrors.push(`${relay}: ${msg}`);
      }
    }),
  );

  pool.close(relays);

  if (collected.length === 0 && relayErrors.length === relays.length) {
    return {
      ok: false,
      error: `Could not fetch from any relay (${relayErrors.length} failed).`,
    };
  }

  return {
    ok: true,
    npub: key.npub,
    pkHex: key.pkHex,
    relays,
    events: dedupeAndSort(collected),
    relayErrors,
  };
}

export function dTagFromEventTags(tags: string[][]): string | null {
  const row = tags.find((t) => t[0] === "d" && t[1]);
  return row?.[1] ?? null;
}

export function eventSummaryLabel(event: Pick<Event, "kind" | "tags">): string {
  const d = dTagFromEventTags(event.tags);
  switch (event.kind) {
    case 0:
      return "Profiel";
    case 5:
      return "Verwijderverzoek";
    case 31923:
      return d ? `Meetup · ${d}` : "Meetup";
    case 31924:
      return d ? `Collectie · ${d}` : "Collectie";
    default:
      return d ? `Kind ${event.kind} · ${d}` : `Kind ${event.kind}`;
  }
}

export type SerializableNostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  createdAtLabel: string;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export async function toSerializableEvent(event: Event): Promise<SerializableNostrEvent> {
  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    createdAtLabel: await formatEventCreatedAt(event.created_at),
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
  };
}

export function eventToDisplayJson(
  event: Pick<Event, "id" | "pubkey" | "created_at" | "kind" | "tags" | "content" | "sig">,
): string {
  return JSON.stringify(
    {
      id: event.id,
      pubkey: event.pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: event.sig,
    },
    null,
    2,
  );
}

export function formatEventCreatedAtSync(createdAt: number, timezone: string): string {
  return new Date(createdAt * 1000).toLocaleString("nl-NL", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function formatEventCreatedAt(createdAt: number): Promise<string> {
  return formatEventCreatedAtSync(createdAt, await getNostrTimezone());
}
