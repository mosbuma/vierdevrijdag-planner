import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function utcStartOfDay(ymd: string): Date | null {
  if (!YMD.test(ymd)) return null;
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function utcEndOfDay(ymd: string): Date | null {
  if (!YMD.test(ymd)) return null;
  const d = new Date(`${ymd}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

type Props = { searchParams: Promise<{ from?: string; to?: string; user?: string }> };

export default async function AuditLogPage({ searchParams }: Props) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isAdmin) redirect("/admin");

  const sp = await searchParams;
  const from = sp.from?.trim() || "";
  const to = sp.to?.trim() || "";
  const userFilter = sp.user?.trim() || "";

  const fromDt = from ? utcStartOfDay(from) : null;
  const toDt = to ? utcEndOfDay(to) : null;

  const rows = await prisma.auditLog.findMany({
    where: {
      AND: [
        fromDt ? { created_at: { gte: fromDt } } : {},
        toDt ? { created_at: { lte: toDt } } : {},
        userFilter ? { username: { contains: userFilter } } : {},
      ],
    },
    orderBy: { created_at: "desc" },
    take: 500,
  });

  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (userFilter) query.set("user", userFilter);
  const qs = query.toString();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Auditlog</h1>
      <p className="mt-2 text-slate-400">
        Mutaties via de API (meetups, programma, posters, gebruikers). Maximaal 500 meest recente resultaten.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-4 border border-slate-700 bg-slate-900/50 p-4">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Van (datum)
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Tot (datum)
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Gebruiker (deel van naam)
          <input
            type="text"
            name="user"
            placeholder="admin"
            defaultValue={userFilter}
            className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
        >
          Filteren
        </button>
        {qs ? (
          <a href="/admin/audit" className="text-sm text-teal-400 no-underline hover:underline">
            Reset
          </a>
        ) : null}
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400">
              <th className="whitespace-nowrap py-2 pr-4">Tijdstip (UTC)</th>
              <th className="whitespace-nowrap py-2 pr-4">Gebruiker</th>
              <th className="whitespace-nowrap py-2 pr-4">Actie</th>
              <th className="whitespace-nowrap py-2 pr-4">Onderwerp</th>
              <th className="py-2">Wijzigingen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-slate-500">
                  Geen regels voor dit filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-800 align-top">
                  <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-slate-300">
                    {r.created_at.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="py-2 pr-4">{r.username}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-teal-300">{r.action}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-400">{r.subject ?? "—"}</td>
                  <td className="py-2">
                    {r.changes == null ? (
                      "—"
                    ) : (
                      <pre className="max-h-40 max-w-xl overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950 p-2 text-xs text-slate-300">
                        {JSON.stringify(r.changes, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
