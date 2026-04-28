import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { posterTemplatePreviewSchema } from "@/lib/validators";
import { renderTemplateEditorPreview } from "@/lib/poster/template-editor-preview";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
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
  const parsed = posterTemplatePreviewSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  const poster = await prisma.poster.findUnique({ where: { id: nid } });
  if (!poster) return jsonError("Not found", 404);
  const { meetingId } = parsed.data;
  if (meetingId !== -1) {
    const m = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { id: true } });
    if (!m) return jsonError("Meetup niet gevonden", 404);
  }
  try {
    const rel = await renderTemplateEditorPreview(nid, meetingId);
    return NextResponse.json({ preview_rel_path: rel });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Preview mislukt";
    return jsonError(msg, 500);
  }
}
