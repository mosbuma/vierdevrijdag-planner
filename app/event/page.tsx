import Image from "next/image";
import { getSession } from "@/lib/auth";
import { PublicLoginCorner } from "@/components/PublicLoginCorner";
import { PublicShareBar } from "@/components/PublicShareBar";
import { getLatestVisibleMeeting, getMeetingByYmdPublic, meetingCacheBustPath } from "@/lib/event-queries";
import { formatDutchLongDate, toMeetParamYmd } from "@/lib/dates";
import { expandMeetingDescriptionPlaceholders } from "@/lib/meeting-description-expand";
import { sanitizeMeetingDescriptionHtml } from "@/lib/meeting-html";
import { formatTimeFromDb } from "@/lib/poster/generate-poster";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import type { Meeting } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ meet?: string; previewId?: string | string[] }> };

export const dynamic = "force-dynamic";

export default async function EventPage({ searchParams }: Props) {
  const [sp, session] = await Promise.all([searchParams, getSession()]);
  const showLogin = !session?.user;

  let meeting: Meeting | null = null;
  let err: "invalid" | "notfound" | "notyet" | null = null;

  const previewRaw = sp.previewId;
  const previewStr = Array.isArray(previewRaw) ? previewRaw[0] : previewRaw;
  const previewId = previewStr != null && String(previewStr).trim() !== "" ? Number(previewStr) : NaN;

  if (Number.isFinite(previewId) && previewId > 0) {
    if (!session?.user) {
      err = "notfound";
    } else {
      const m = await prisma.meeting.findUnique({ where: { id: previewId } });
      if (!m) err = "notfound";
      else meeting = m;
    }
  } else {
    const meetRaw = sp.meet;
    const meet = (Array.isArray(meetRaw) ? meetRaw[0] : meetRaw ?? "latest").toLowerCase().trim();

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
    orderBy: [{ slot_start: "asc" }, { sort_order: "asc" }, { id: "asc" }],
  });

  const posterSrc = meetingCacheBustPath(meeting.poster_rel_path, meeting.updated_at);
  const alt = `${meeting.event_title} ${formatDutchLongDate(meeting.meetup_date)}`;
  const siteOrigin = getPublicSiteOrigin();
  const shareUrl = `${siteOrigin}/event?meet=${toMeetParamYmd(meeting.meetup_date)}`;
  const shareTitle = `${meeting.event_title} — ${formatDutchLongDate(meeting.meetup_date)}`;
  const programHtmlBase = sanitizeMeetingDescriptionHtml(meeting.program_description_html);
  const programHtmlSafe = programHtmlBase
    ? expandMeetingDescriptionPlaceholders(programHtmlBase, meeting.meetup_date, items, {
        venueLine: meeting.venue_line,
      })
    : null;

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
        {programHtmlSafe ? (
          <section
            className="event-description prose prose-invert prose-headings:text-slate-100 prose-p:mb-5 prose-p:mt-0 prose-p:text-slate-300 prose-p:first:mt-0 prose-a:text-teal-400 prose-strong:text-white prose-li:marker:text-teal-500 mt-8 max-w-none border-t border-slate-700 pt-8 leading-relaxed [&_br]:mb-4 [&_br]:block [&_p.vdv-blank-line]:my-6 [&_p.vdv-blank-line]:block [&_p.vdv-blank-line]:min-h-[1.35em] [&_.vdv-prog-item]:my-0"
            aria-label="Programma en informatie"
            dangerouslySetInnerHTML={{ __html: programHtmlSafe }}
          />
        ) : null}
        <ul className="sr-only">
          {items.map((it) => (
            <li key={it.id}>
              {formatTimeFromDb(it.slot_start)} – {formatTimeFromDb(it.slot_end)}: {it.description}
              {it.speakers ? ` (${it.speakers})` : ""}
            </li>
          ))}
        </ul>
        <div className="mt-10 flex w-full justify-center pb-4">
          <PublicShareBar url={shareUrl} title={shareTitle} />
        </div>
      </main>
    </>
  );
}
