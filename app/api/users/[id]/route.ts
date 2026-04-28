import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { patchUserSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth-utils";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);
  const { id } = await ctx.params;
  const uid = Number(id);
  if (!Number.isFinite(uid)) return jsonError("Invalid id", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  if (parsed.data.password === undefined && parsed.data.role === undefined) {
    return jsonError("No fields", 400);
  }
  const data: { password_hash?: string; role?: "USER" | "ADMIN" } = {};
  if (parsed.data.password) data.password_hash = hashPassword(parsed.data.password);
  if (parsed.data.role) data.role = parsed.data.role;
  try {
    const user = await prisma.user.update({
      where: { id: uid },
      data,
      select: { id: true, username: true, role: true, updated_at: true },
    });
    await writeAuditLog({
      username: auth.username,
      action: "users.PATCH",
      subject: `user:${uid}`,
      changes: {
        role: parsed.data.role,
        password_changed: Boolean(parsed.data.password),
      },
    });
    return NextResponse.json(user);
  } catch {
    return jsonError("Not found", 404);
  }
}
