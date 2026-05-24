import { NextResponse } from "next/server";
import { fetchAuthorEventsFromRelays, toSerializableEvent } from "@/lib/nostr/fetch-author-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await fetchAuthorEventsFromRelays();
  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }

  const events = await Promise.all(result.events.map(toSerializableEvent));
  return NextResponse.json({
    ok: true as const,
    npub: result.npub,
    relays: result.relays,
    relayErrors: result.relayErrors,
    events,
  });
}
