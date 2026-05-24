import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit-log";
import { requestAllEventsDeletion } from "@/lib/nostr/publisher";

export const runtime = "nodejs";

export async function POST() {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);

  try {
    const summary = await requestAllEventsDeletion();
    await writeAuditLog({
      username: auth.username,
      action: "nostr.deleteAllEvents",
      subject: "events",
      changes: summary,
    });
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete all failed";
    return jsonError(msg, 400);
  }
}
