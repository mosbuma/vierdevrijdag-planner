import Image from "next/image";
import { getSession } from "@/lib/auth";
import { PublicLoginCorner } from "@/components/PublicLoginCorner";
import { PublicShareBar } from "@/components/PublicShareBar";
import { getLatestVisibleMeeting, getMeetingByYmdPublic, meetingCacheBustPath } from "@/lib/event-queries";
import { prisma } from "@/lib/prisma";
import { formatDutchLongDate, toMeetParamYmd } from "@/lib/dates";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { formatTimeFromDb } from "@/lib/poster/generate-poster";

type Props = { searchParams: Promise<{ meet?: string }> };

export const dynamic = "force-dynamic";

export default async function EventPage({ searchParams }: Props) {
  const [sp, session] = await Promise.all([searchParams, getSession()]);
  const meetRaw = sp.meet;
  const meet = (Array.isArray(meetRaw) ? meetRaw[0] : meetRaw ?? "latest").toLowerCase().trim();
  const showLogin = !session;

  let meeting: Awaited<ReturnType<typeof getLatestVisibleMeeting>> | null = null;
  let err: "invalid" | "notfound" | "notyet" | null = null;

  if (meet === "latest") {
    meeting = await getLatestVisibleMeeting();
    if (!meeting) err = "notfound";
  } else {
    const res = await getMeetingByYmdPublic(meet);
    if (!res.ok) {
      err = res.error;
    } else {
      meeting = res.meeting;
    }
  }

  if (err || !meeting) {
    const msg =
      err === "invalid"
        ? "Ongeldige datum. Gebruik meet=latest of meet=YYYYMMDD."
        : err === "notyet"
          ? "Deze pagina is nog niet publiek (visible from)."
          : "Geen aankomende meetup gevonden.";
    return (
      <>
        {showLogin ? <PublicLoginCorner /> : null}
        <main
          className={`mx-auto max-w-lg px-4 py-16 text-center text-slate-200 ${showLogin ? "pt-14" : ""}`}
        >
          <h1 className="text-xl font-semibold">VierDeVrijdag</h1>
          <p className="mt-4 text-slate-400">{msg}</p>
        </main>
      </>
    );
  }

  const items = await prisma.programItem.findMany({
    where: { meeting_id: meeting.id },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  });

  const posterSrc = meetingCacheBustPath(meeting.poster_rel_path, meeting.updated_at);
  const alt = `${meeting.event_title} ${formatDutchLongDate(meeting.meetup_date)}`;
  const siteOrigin = getPublicSiteOrigin();
  const shareUrl = `${siteOrigin}/event?meet=${toMeetParamYmd(meeting.meetup_date)}`;
  const shareTitle = `${meeting.event_title} — ${formatDutchLongDate(meeting.meetup_date)}`;

  return (
    <>
      {showLogin ? <PublicLoginCorner /> : null}
      <main className={`mx-auto max-w-2xl px-4 py-8 ${showLogin ? "pt-14" : ""}`}>
        <h1 className="sr-only">{alt}</h1>
        {posterSrc ? (
          <div className="relative w-full overflow-hidden rounded-lg shadow-lg">
            <Image src={posterSrc} alt={alt} width={937} height={1678} className="h-auto w-full" priority unoptimized />
          </div>
        ) : (
          <p className="text-slate-400">Poster wordt nog gegenereerd.</p>
        )}
        <div className="mt-5 flex w-full justify-center">
          <PublicShareBar url={shareUrl} title={shareTitle} />
        </div>
        <ul className="sr-only">
          {items.map((it) => (
            <li key={it.id}>
              {formatTimeFromDb(it.slot_start)} – {formatTimeFromDb(it.slot_end)}: {it.description}
              {it.speakers ? ` (${it.speakers})` : ""}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
