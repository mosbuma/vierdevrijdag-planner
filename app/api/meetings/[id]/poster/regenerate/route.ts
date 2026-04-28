import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) return jsonError("Invalid id", 400);
  const exists = await prisma.meeting.findUnique({ where: { id: nid } });
  if (!exists) return jsonError("Not found", 404);
  try {
    await syncPosterForMeeting(nid);
    await writeAuditLog({
      username: auth.username,
      action: "meetings.poster-regenerate.POST",
      subject: `meeting:${nid}`,
      changes: { regenerated: true },
    });
    const row = await prisma.meeting.findUnique({
      where: { id: nid },
      select: { id: true, poster_rel_path: true, updated_at: true },
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Poster genereren mislukt";
    return jsonError(msg, 500);
  }
}
