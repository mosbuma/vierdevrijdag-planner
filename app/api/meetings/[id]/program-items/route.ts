import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createProgramItemSchema } from "@/lib/validators";
import { parseTimeToDb } from "@/lib/time-db";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const meetingId = Number(id);
  if (!Number.isFinite(meetingId)) return jsonError("Invalid id", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = createProgramItemSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { tracks: true },
  });
  if (!meeting) return jsonError("Not found", 404);
  const trackOk = meeting.tracks.some((t) => t.id === parsed.data.track_id);
  if (!trackOk) return jsonError("Invalid track_id for this meeting", 400);
  const maxSort = await prisma.programItem.aggregate({
    where: { meeting_id: meetingId, track_id: parsed.data.track_id },
    _max: { sort_order: true },
  });
  const sortOrder = parsed.data.sort_order ?? (maxSort._max.sort_order ?? -1) + 1;
  try {
    const item = await prisma.programItem.create({
      data: {
        meeting_id: meetingId,
        track_id: parsed.data.track_id,
        slot_start: parseTimeToDb(parsed.data.slot_start),
        slot_end: parseTimeToDb(parsed.data.slot_end),
        description: parsed.data.description,
        speakers: parsed.data.speakers ?? null,
        sort_order: sortOrder,
      },
    });
    await syncPosterForMeeting(meetingId);
    await writeAuditLog({
      username: auth.username,
      action: "meetings.program-items.POST",
      subject: `meeting:${meetingId}/item:${item.id}`,
      changes: { ...parsed.data, id: item.id },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return jsonError(msg, 500);
  }
}
