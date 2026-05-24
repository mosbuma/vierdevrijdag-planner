import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit-log";
import { publishMeeting } from "@/lib/nostr/publisher";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) return jsonError("Invalid id", 400);

  try {
    const result = await publishMeeting(nid);
    await writeAuditLog({
      username: auth.username,
      action: "nostr.publishMeeting",
      subject: `meeting:${nid}`,
      changes: { eventId: result.id, relays: result.acceptedRelays },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    return jsonError(msg, 400);
  }
}
