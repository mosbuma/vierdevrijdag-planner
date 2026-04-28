import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { patchMeetingTrackSchema } from "@/lib/validators";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string; trackId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);
  const { id, trackId } = await ctx.params;
  const meetingId = Number(id);
  const tid = Number(trackId);
  if (!Number.isFinite(meetingId) || !Number.isFinite(tid)) return jsonError("Invalid id", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = patchMeetingTrackSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  if (Object.keys(parsed.data).length === 0) return jsonError("No fields", 400);
  const existing = await prisma.meetingTrack.findFirst({
    where: { id: tid, meeting_id: meetingId },
  });
  if (!existing) return jsonError("Not found", 404);
  const data: { name?: string; sort_order?: number } = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.sort_order !== undefined) data.sort_order = parsed.data.sort_order;
  const track = await prisma.meetingTrack.update({
    where: { id: tid },
    data,
  });
  await syncPosterForMeeting(meetingId);
  await writeAuditLog({
    username: auth.username,
    action: "meetings.tracks.PATCH",
    subject: `meeting:${meetingId}/track:${tid}`,
    changes: parsed.data,
  });
  return NextResponse.json(track);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);
  const { id, trackId } = await ctx.params;
  const meetingId = Number(id);
  const tid = Number(trackId);
  if (!Number.isFinite(meetingId) || !Number.isFinite(tid)) return jsonError("Invalid id", 400);
  const existing = await prisma.meetingTrack.findFirst({
    where: { id: tid, meeting_id: meetingId },
  });
  if (!existing) return jsonError("Not found", 404);
  const count = await prisma.meetingTrack.count({ where: { meeting_id: meetingId } });
  if (count <= 1) return jsonError("Minimaal één track vereist", 400);
  await prisma.meetingTrack.delete({ where: { id: tid } });
  await syncPosterForMeeting(meetingId);
  await writeAuditLog({
    username: auth.username,
    action: "meetings.tracks.DELETE",
    subject: `meeting:${meetingId}/track:${tid}`,
    changes: { deleted: true, name: existing.name },
  });
  return new NextResponse(null, { status: 204 });
}
