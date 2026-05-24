import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit-log";
import { publishProfile } from "@/lib/nostr/publisher";

export const runtime = "nodejs";

export async function POST() {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);

  try {
    const result = await publishProfile();
    await writeAuditLog({
      username: auth.username,
      action: "nostr.publishProfile",
      subject: "profile",
      changes: { eventId: result.id },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    return jsonError(msg, 500);
  }
}
