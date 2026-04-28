import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@prisma/client";

export { hashPassword } from "@/lib/password";

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ id: number; role: Role; isAdmin: boolean } | null> {
  const user = await prisma.user.findUnique({
    where: { username },
  });
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  return {
    id: user.id,
    role: user.role,
    isAdmin: user.role === "ADMIN",
  };
}
