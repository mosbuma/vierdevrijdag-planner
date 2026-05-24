import Link from "next/link";
import { CreateStandardMeetupButton } from "@/components/CreateStandardMeetupButton";
import { NostrAdminPanel } from "@/components/NostrAdminPanel";
import { getAuthContext } from "@/lib/auth";
import { getNip05Identifier } from "@/lib/nostr/nip05";
import { prisma } from "@/lib/prisma";
import { amsterdamTodayYmd, isMeetingPublicVisible, toAmsterdamYmd } from "@/lib/dates";

export default async function AdminHomePage() {
  const ctx = await getAuthContext();
  const todayYmd = amsterdamTodayYmd();
  const nip05Id = ctx?.isAdmin ? await getNip05Identifier().catch(() => null) : null;
  const meetings = await prisma.meeting.findMany({
    orderBy: { meetup_date: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Meetups</h1>
          <p className="mt-2 text-slate-400">Beheer data, zichtbaarheid en programma.</p>
        </div>
        <CreateStandardMeetupButton />
      </div>
      {ctx?.isAdmin ? <NostrAdminPanel nip05Id={nip05Id} /> : null}
      <table className="mt-6">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Zichtbaar vanaf</th>
            <th>Locatie</th>
            <th>Sjabloon</th>
            <th>Items</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id}>
              <td>{toAmsterdamYmd(m.meetup_date)}</td>
              <td className="whitespace-nowrap">
                <span className="inline-flex items-center gap-2 tabular-nums">
                  {toAmsterdamYmd(m.visible_from)}
                  {isMeetingPublicVisible(m.visible_from, todayYmd) ? (
                    <span className="font-semibold text-teal-400" title="Nu publiek zichtbaar op de site" aria-label="Nu publiek zichtbaar">
                      ✓
                    </span>
                  ) : null}
                </span>
              </td>
              <td className="max-w-xs truncate">{m.venue_line}</td>
              <td>{m.is_template ? "ja" : ""}</td>
              <td>{m._count.items}</td>
              <td>
                <Link href={`/meetings/${m.id}/edit`} className="text-teal-400">
                  Bewerken
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {meetings.length === 0 && <p className="mt-6 text-slate-500">Nog geen meetups. Maak er een aan.</p>}
    </div>
  );
}
