import { SimplePool } from "nostr-tools/pool";
import type { Event } from "nostr-tools/core";
import { getNostrTimezone } from "@/lib/nostr/config";
import { getRelays } from "@/lib/nostr/relays";
import { tryLoadServerPubkey } from "@/lib/nostr/keys";

const QUERY_TIMEOUT_MS = 10_000;
const MAX_EVENTS = 500;

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

export async function fetchAuthorEventsFromRelays(): Promise<FetchAuthorEventsResult> {
  const key = tryLoadServerPubkey();
  if (!key) {
    return { ok: false, error: "NOSTR_NPUB or NOSTR_NSEC is not configured." };
  }

  const relays = getRelays();
  const pool = new SimplePool();
  const relayErrors: string[] = [];
  const collected: Event[] = [];

  await Promise.allSettled(
    relays.map(async (relay) => {
      try {
        const rows = await pool.querySync(
          [relay],
          { authors: [key.pkHex], limit: MAX_EVENTS },
          { maxWait: QUERY_TIMEOUT_MS },
        );
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

export function eventToDisplayJson(event: Event): string {
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

export function formatEventCreatedAt(createdAt: number): string {
  const timezone = getNostrTimezone();
  return new Date(createdAt * 1000).toLocaleString("nl-NL", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}
