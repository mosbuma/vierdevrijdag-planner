import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function MeetingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8">
      <AdminNav isAdmin={ctx.isAdmin} />
      {children}
    </div>
  );
}
