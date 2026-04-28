import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";
import { writeAuditLog } from "@/lib/audit-log";

const schema = z.object({
  name: z.string().min(1).max(100),
});

type Ctx = { params: Promise<{ id: string }> };

/** Extra parallel track (admin only). */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);
  const { id } = await ctx.params;
  const meetingId = Number(id);
  if (!Number.isFinite(meetingId)) return jsonError("Invalid id", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return jsonError("Not found", 404);
  const maxSort = await prisma.meetingTrack.aggregate({
    where: { meeting_id: meetingId },
    _max: { sort_order: true },
  });
  const track = await prisma.meetingTrack.create({
    data: {
      meeting_id: meetingId,
      name: parsed.data.name,
      sort_order: (maxSort._max.sort_order ?? -1) + 1,
    },
  });
  await syncPosterForMeeting(meetingId);
  await writeAuditLog({
    username: auth.username,
    action: "meetings.tracks.POST",
    subject: `meeting:${meetingId}/track:${track.id}`,
    changes: { name: parsed.data.name, track_id: track.id },
  });
  return NextResponse.json(track, { status: 201 });
}
