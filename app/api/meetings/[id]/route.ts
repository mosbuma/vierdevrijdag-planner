import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { patchMeetingSchema } from "@/lib/validators";
import { dateFromYmd } from "@/lib/date-parse";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) return jsonError("Invalid id", 400);
  const row = await prisma.meeting.findUnique({
    where: { id: nid },
    include: {
      tracks: { orderBy: { sort_order: "asc" } },
      items: { orderBy: [{ sort_order: "asc" }, { id: "asc" }], include: { track: true } },
    },
  });
  if (!row) return jsonError("Not found", 404);
  return NextResponse.json(row);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) return jsonError("Invalid id", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = patchMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid body", 400);
  }
  const exists = await prisma.meeting.findUnique({ where: { id: nid } });
  if (!exists) return jsonError("Not found", 404);
  const data: Prisma.MeetingUpdateInput = {};
  if (parsed.data.meetup_date) data.meetup_date = dateFromYmd(parsed.data.meetup_date);
  if (parsed.data.visible_from) data.visible_from = dateFromYmd(parsed.data.visible_from);
  if (parsed.data.venue_line) data.venue_line = parsed.data.venue_line;
  if (parsed.data.event_title) data.event_title = parsed.data.event_title;
  if (parsed.data.poster_id !== undefined) {
    data.poster = { connect: { id: parsed.data.poster_id } };
  }
  if (Object.keys(data).length === 0) return jsonError("No fields to update", 400);
  try {
    await prisma.meeting.update({
      where: { id: nid },
      data,
    });
    await syncPosterForMeeting(nid);
    await writeAuditLog({
      username: auth.username,
      action: "meetings.PATCH",
      subject: `meeting:${nid}`,
      changes: parsed.data,
    });
    const row = await prisma.meeting.findUnique({
      where: { id: nid },
      include: {
        tracks: { orderBy: { sort_order: "asc" } },
        items: { orderBy: [{ sort_order: "asc" }], include: { track: true } },
      },
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    if (String(msg).includes("Unique constraint")) {
      return jsonError("Er bestaat al een meetup op deze datum.", 409);
    }
    return jsonError(msg, 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) return jsonError("Invalid id", 400);
  const row = await prisma.meeting.findUnique({
    where: { id: nid },
    select: { id: true, is_template: true },
  });
  if (!row) return jsonError("Not found", 404);
  if (row.is_template) return jsonError("De sjabloonmeetup kan niet worden verwijderd.", 400);
  try {
    await prisma.meeting.delete({ where: { id: nid } });
    await writeAuditLog({
      username: auth.username,
      action: "meetings.DELETE",
      subject: `meeting:${nid}`,
      changes: { deleted: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("Not found", 404);
  }
}
