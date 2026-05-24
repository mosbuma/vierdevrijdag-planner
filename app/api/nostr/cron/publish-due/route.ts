import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { publishDueMeetings } from "@/lib/nostr/publisher";

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

  try {
    const summary = await publishDueMeetings();
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron publish failed";
    return jsonError(msg, 500);
  }
}
