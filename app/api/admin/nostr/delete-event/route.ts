import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit-log";
import { requestEventDeletion } from "@/lib/nostr/publisher";

export const runtime = "nodejs";

const bodySchema = z.object({
  eventId: z.string().regex(/^[0-9a-f]{64}$/i),
  kind: z.number().int().nonnegative(),
  dTag: z.string().min(1).max(128).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);

  try {
    const result = await requestEventDeletion({
      eventId: parsed.data.eventId.toLowerCase(),
      kind: parsed.data.kind,
      dTag: parsed.data.dTag ?? null,
    });
    await writeAuditLog({
      username: auth.username,
      action: "nostr.deleteEvent",
      subject: `event:${parsed.data.eventId}`,
      changes: {
        kind: parsed.data.kind,
        dTag: parsed.data.dTag ?? null,
        deletionRequestId: result.id,
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return jsonError(msg, 400);
  }
}
