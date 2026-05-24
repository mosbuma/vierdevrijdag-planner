import { getAuthContext } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function NostrLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {ctx ? <AdminNav isAdmin={ctx.isAdmin} /> : null}
      {children}
    </div>
  );
}
