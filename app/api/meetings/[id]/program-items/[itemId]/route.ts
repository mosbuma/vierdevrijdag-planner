import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizeMeetingDescriptionHtml } from "@/lib/meeting-html";
import { patchProgramItemSchema } from "@/lib/validators";
import { parseTimeToDb } from "@/lib/time-db";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";
import { writeAuditLog } from "@/lib/audit-log";
import { republishIfDirty } from "@/lib/nostr/publisher";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id, itemId } = await ctx.params;
  const meetingId = Number(id);
  const pid = Number(itemId);
  if (!Number.isFinite(meetingId) || !Number.isFinite(pid)) return jsonError("Invalid id", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = patchProgramItemSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  const existing = await prisma.programItem.findFirst({
    where: { id: pid, meeting_id: meetingId },
  });
  if (!existing) return jsonError("Not found", 404);
  if (parsed.data.track_id) {
    const track = await prisma.meetingTrack.findFirst({
      where: { id: parsed.data.track_id, meeting_id: meetingId },
    });
    if (!track) return jsonError("Invalid track", 400);
  }
  const data: {
    track_id?: number;
    slot_start?: Date;
    slot_end?: Date;
    description?: string;
    row_description_html?: string | null;
    speakers?: string | null;
    sort_order?: number;
  } = {};
  if (parsed.data.track_id != null) data.track_id = parsed.data.track_id;
  if (parsed.data.slot_start) data.slot_start = parseTimeToDb(parsed.data.slot_start);
  if (parsed.data.slot_end) data.slot_end = parseTimeToDb(parsed.data.slot_end);
  if (parsed.data.description) data.description = parsed.data.description;
  if (parsed.data.row_description_html !== undefined) {
    data.row_description_html = sanitizeMeetingDescriptionHtml(parsed.data.row_description_html);
  }
  if (parsed.data.speakers !== undefined) data.speakers = parsed.data.speakers ?? null;
  if (parsed.data.sort_order !== undefined) data.sort_order = parsed.data.sort_order;
  if (Object.keys(data).length === 0) return jsonError("No fields", 400);
  const item = await prisma.programItem.update({
    where: { id: pid },
    data,
  });
  await syncPosterForMeeting(meetingId);
  await republishIfDirty(meetingId);
  await writeAuditLog({
    username: auth.username,
    action: "meetings.program-items.PATCH",
    subject: `meeting:${meetingId}/item:${pid}`,
    changes: parsed.data,
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id, itemId } = await ctx.params;
  const meetingId = Number(id);
  const pid = Number(itemId);
  if (!Number.isFinite(meetingId) || !Number.isFinite(pid)) return jsonError("Invalid id", 400);
  const existing = await prisma.programItem.findFirst({
    where: { id: pid, meeting_id: meetingId },
  });
  if (!existing) return jsonError("Not found", 404);
  await prisma.programItem.delete({ where: { id: pid } });
  await syncPosterForMeeting(meetingId);
  await republishIfDirty(meetingId);
  await writeAuditLog({
    username: auth.username,
    action: "meetings.program-items.DELETE",
    subject: `meeting:${meetingId}/item:${pid}`,
    changes: { deleted: true, description: existing.description },
  });
  return new NextResponse(null, { status: 204 });
}
