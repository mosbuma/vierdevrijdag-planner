import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";

export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getAuthContext(): Promise<{
  userId: number;
  username: string;
  role: Role;
  isAdmin: boolean;
} | null> {
  const session = await getSession();
  const u = session?.user as { id?: string; name?: string; role?: Role; isAdmin?: boolean } | undefined;
  if (!u?.id || !u.role) return null;
  return {
    userId: Number(u.id),
    username: u.name ?? "",
    role: u.role,
    isAdmin: Boolean(u.isAdmin),
  };
}

export async function requireUser() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (!ctx.isAdmin) throw new Error("Forbidden");
  return ctx;
}
