/**
 * Serves `/generated/posters/*.jpg` from `POSTER_STORAGE_DIR` (default `data/posters/`), not from `public/`.
 */
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { dateFromYmd } from "@/lib/date-parse";
import { prisma } from "@/lib/prisma";
import { renderPosterTemplateDummyPreview } from "@/lib/poster/dummy-template-preview";
import { posterFileAbsolutePath } from "@/lib/poster/poster-storage-path";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";

/** YYYYMMDD.jpg or template-preview-{id}.jpg */
const SAFE_FILE = /^(?:\d{8}|template-preview-\d+)\.jpg$/;
const MEETUP_FILE = /^(\d{8})\.jpg$/;
const TEMPLATE_PREVIEW_FILE = /^template-preview-(\d+)\.jpg$/;

type Ctx = { params: Promise<{ file: string }> };

async function jpegResponse(abs: string): Promise<NextResponse> {
  const buf = await fs.readFile(abs);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { file } = await ctx.params;
  if (!file || !SAFE_FILE.test(file)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const rel = `generated/posters/${file}`;
  let abs: string;
  try {
    abs = posterFileAbsolutePath(rel);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    return await jpegResponse(abs);
  } catch {
    /* missing on disk — try to generate into POSTER_STORAGE_DIR (never fall back to public/) */
  }

  try {
    const meetupM = MEETUP_FILE.exec(file);
    if (meetupM) {
      const compact = meetupM[1]!;
      const dashed = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
      const meeting = await prisma.meeting.findUnique({
        where: { meetup_date: dateFromYmd(dashed) },
      });
      if (!meeting) {
        return new NextResponse("Not found", { status: 404 });
      }
      await syncPosterForMeeting(meeting.id);
    } else {
      const tmplM = TEMPLATE_PREVIEW_FILE.exec(file);
      if (!tmplM) {
        return new NextResponse("Not found", { status: 404 });
      }
      const posterTemplateId = Number(tmplM[1]);
      const poster = await prisma.poster.findUnique({ where: { id: posterTemplateId } });
      if (!poster) {
        return new NextResponse("Not found", { status: 404 });
      }
      await renderPosterTemplateDummyPreview(posterTemplateId);
    }

    return await jpegResponse(abs);
  } catch (e) {
    console.error("[generated/posters]", e);
    return new NextResponse("Poster generation failed", { status: 502 });
  }
}
