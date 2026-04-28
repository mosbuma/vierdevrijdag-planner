import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { posterFileAbsolutePath } from "@/lib/poster/poster-storage-path";

/** YYYYMMDD.jpg or template-preview-{id}.jpg */
const SAFE_FILE = /^(?:\d{8}|template-preview-\d+)\.jpg$/;

type Ctx = { params: Promise<{ file: string }> };

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
    const buf = await fs.readFile(abs);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
