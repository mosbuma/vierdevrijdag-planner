import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { backfillMeetingsToNostr } from "@/lib/nostr/publisher";

export const runtime = "nodejs";

function verifyCronAuth(req: Request): boolean {
  const token = process.env.NOSTR_CRON_TOKEN?.trim();
  if (!token) return false;
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return Boolean(m && m[1] === token);
}

export async function POST(req: Request) {
  if (!verifyCronAuth(req)) {
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const includePast = url.searchParams.get("includePast") === "1";

  try {
    const summary = await backfillMeetingsToNostr({ includePast });
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Backfill failed";
    return jsonError(msg, 500);
  }
}
