import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return jsonError("Unauthorized", 401);
  const rows = await prisma.meeting.findMany({
    orderBy: { meetup_date: "desc" },
    include: { _count: { select: { items: true, tracks: true } } },
  });
  return NextResponse.json(rows);
}
