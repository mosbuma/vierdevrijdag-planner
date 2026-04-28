import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  const rows = await prisma.poster.findMany({
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    include: { _count: { select: { meetings: true } } },
  });
  return NextResponse.json(rows);
}
