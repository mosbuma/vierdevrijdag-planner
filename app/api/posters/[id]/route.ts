import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { patchPosterSchema } from "@/lib/validators";
import { renderPosterTemplateDummyPreview } from "@/lib/poster/dummy-template-preview";
import { syncAllMeetingsForPoster } from "@/lib/poster/sync-posters-for-template";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) return jsonError("Invalid id", 400);
  const row = await prisma.poster.findUnique({ where: { id: nid } });
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
  const parsed = patchPosterSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  const exists = await prisma.poster.findUnique({ where: { id: nid } });
  if (!exists) return jsonError("Not found", 404);
  const data: Prisma.PosterUpdateInput = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.slug !== undefined) data.slug = parsed.data.slug;
  if (parsed.data.template_rel_path !== undefined) data.template_rel_path = parsed.data.template_rel_path;
  if (parsed.data.title_region !== undefined) data.title_region = parsed.data.title_region as Prisma.InputJsonValue;
  if (parsed.data.program_region !== undefined) data.program_region = parsed.data.program_region as Prisma.InputJsonValue;
  if (parsed.data.sort_order !== undefined) data.sort_order = parsed.data.sort_order;
  if (Object.keys(data).length === 0) return jsonError("No fields to update", 400);
  const needsResync =
    parsed.data.title_region !== undefined ||
    parsed.data.program_region !== undefined ||
    parsed.data.template_rel_path !== undefined;
  try {
    const row = await prisma.poster.update({ where: { id: nid }, data });
    if (needsResync) {
      await syncAllMeetingsForPoster(nid);
      await renderPosterTemplateDummyPreview(nid);
    }
    await writeAuditLog({
      username: auth.username,
      action: "posters.PATCH",
      subject: `poster:${nid}`,
      changes: parsed.data,
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    if (String(msg).includes("Unique constraint")) {
      return jsonError("Slug bestaat al.", 409);
    }
    return jsonError(msg, 500);
  }
}
