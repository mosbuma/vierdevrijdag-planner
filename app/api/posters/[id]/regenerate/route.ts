import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { renderPosterTemplateDummyPreview } from "@/lib/poster/dummy-template-preview";
import { syncAllMeetingsForPoster } from "@/lib/poster/sync-posters-for-template";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) return jsonError("Invalid id", 400);
  const exists = await prisma.poster.findUnique({ where: { id: nid } });
  if (!exists) return jsonError("Not found", 404);
  try {
    await syncAllMeetingsForPoster(nid);
    await renderPosterTemplateDummyPreview(nid);
    await writeAuditLog({
      username: auth.username,
      action: "posters.regenerate.POST",
      subject: `poster:${nid}`,
      changes: { regenerated: true },
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Regenereren mislukt";
    return jsonError(msg, 500);
  }
}
