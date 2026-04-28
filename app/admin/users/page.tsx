import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "@/components/UsersClient";

export default async function UsersAdminPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isAdmin) redirect("/admin");
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, username: true, role: true, created_at: true },
  });
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Gebruikers</h1>
      <p className="mt-2 text-slate-400">Alleen beheerders kunnen gebruikers aanmaken of rollen wijzigen.</p>
      <UsersClient initialUsers={users} />
    </div>
  );
}
