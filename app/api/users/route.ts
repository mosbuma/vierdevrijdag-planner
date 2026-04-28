import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth-utils";
import { redactPasswordFields, writeAuditLog } from "@/lib/audit-log";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, username: true, role: true, created_at: true, updated_at: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  try {
    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        password_hash: hashPassword(parsed.data.password),
        role: parsed.data.role,
      },
      select: { id: true, username: true, role: true, created_at: true },
    });
    await writeAuditLog({
      username: auth.username,
      action: "users.POST",
      subject: `user:${user.id}`,
      changes: redactPasswordFields({ ...parsed.data, id: user.id } as Record<string, unknown>),
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    if (String(e).includes("Unique constraint")) {
      return jsonError("Gebruikersnaam bestaat al.", 409);
    }
    return jsonError("Create failed", 500);
  }
}
