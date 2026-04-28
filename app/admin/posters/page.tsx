import Link from "next/link";
import { prisma } from "@/lib/prisma";

function templateImageSrc(templateRelPath: string): string {
  const path = templateRelPath.replace(/^\//, "");
  return `/${path}`;
}

export default async function PostersListPage() {
  const posters = await prisma.poster.findMany({
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    include: { _count: { select: { meetings: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Posters</h1>
      <p className="mt-2 text-slate-400">Sjablonen voor exports; tekstvakken op de template.</p>
      <table className="mt-6">
        <thead>
          <tr>
            <th className="w-56 min-w-56 pr-3 text-left font-normal text-slate-500">Voorbeeld</th>
            <th>Naam</th>
            <th>Slug</th>
            <th>Template</th>
            <th>Meetups</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {posters.map((p) => (
            <tr key={p.id}>
              <td className="w-56 min-w-56 py-2 pr-3 align-middle">
                {/* eslint-disable-next-line @next/next/no-img-element -- small static public asset */}
                <img
                  src={templateImageSrc(p.template_rel_path)}
                  alt=""
                  width={224}
                  height={224}
                  className="block h-56 w-56 max-w-none shrink-0 rounded border border-slate-600 bg-slate-900 object-contain"
                />
              </td>
              <td className="text-slate-200">{p.name}</td>
              <td className="font-mono text-sm text-slate-400">{p.slug}</td>
              <td className="max-w-[12rem] truncate text-slate-400">{p.template_rel_path}</td>
              <td>{p._count.meetings}</td>
              <td>
                <Link href={`/admin/posters/${p.id}/edit`} className="text-teal-400">
                  Bewerken
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {posters.length === 0 && <p className="mt-6 text-slate-500">Geen posters. Voer database-seed of migratie uit.</p>}
    </div>
  );
}
