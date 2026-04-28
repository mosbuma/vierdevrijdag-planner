import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicLoginCorner } from "@/components/PublicLoginCorner";
import { PublicShareBar } from "@/components/PublicShareBar";
import { getSession } from "@/lib/auth";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { formatDutchLongDate, toMeetParamYmd } from "@/lib/dates";
import { getPublicMeetupLists, meetingCacheBustPath } from "@/lib/event-queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/admin");

  const { visible: upcoming, notYetPublic: waitingPublic } = await getPublicMeetupLists();
  const nextMeeting = upcoming[0] ?? null;
  const posterSrc = nextMeeting ? meetingCacheBustPath(nextMeeting.poster_rel_path, nextMeeting.updated_at) : "";
  const posterAlt = nextMeeting
    ? `${nextMeeting.event_title} ${formatDutchLongDate(nextMeeting.meetup_date)}`
    : "VierDeVrijdag";
  const siteOrigin = getPublicSiteOrigin();
  const shareUrl = siteOrigin + "/";
  const shareTitle = nextMeeting ? posterAlt : "VierDeVrijdag";

  return (
    <div className="min-h-screen">
      <PublicLoginCorner />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-14">
        <h1 className="sr-only">VierDeVrijdag</h1>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 flex-1">
            {nextMeeting ? (
              <>
                {posterSrc ? (
                  <div className="flex w-full justify-center overflow-hidden rounded-lg shadow-lg ring-1 ring-slate-700/60">
                    <Image
                      src={posterSrc}
                      alt={posterAlt}
                      width={937}
                      height={1678}
                      className="h-auto max-h-[calc(100dvh-6rem)] w-auto max-w-full object-contain"
                      priority
                      unoptimized
                    />
                  </div>
                ) : (
                  <p className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-8 text-center text-slate-400">
                    Poster voor {formatDutchLongDate(nextMeeting.meetup_date)} wordt nog gegenereerd.
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-12 text-center">
                <p className="text-lg text-slate-200">VierDeVrijdag</p>
                <p className="mt-2 text-slate-400">Er zijn nog geen aankomende meetups om te tonen.</p>
              </div>
            )}
            <div className="mt-6 flex w-full justify-center">
              <PublicShareBar url={shareUrl} title={shareTitle} />
            </div>
          </div>

          <section
            className="w-full shrink-0 lg:sticky lg:top-14 lg:w-[min(100%,22rem)] xl:w-80"
            aria-labelledby="upcoming-heading"
          >
            <h2
              id="upcoming-heading"
              className="text-base font-bold uppercase tracking-wide text-white"
            >
              Aankomende meetups
            </h2>
            {upcoming.length === 0 && waitingPublic.length === 0 ? (
              <p className="mt-3 text-sm text-slate-200">Geen aankomende meetups in de agenda.</p>
            ) : null}
            {upcoming.length === 0 && waitingPublic.length > 0 ? (
              <p className="mt-3 rounded-md border border-amber-600/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                Er {waitingPublic.length === 1 ? "staat" : "staan"} {waitingPublic.length} meetup
                {waitingPublic.length === 1 ? "" : "s"} gepland, maar die {waitingPublic.length === 1 ? "is" : "zijn"} nog niet
                publiek zichtbaar (pas vanaf de ingestelde datum &quot;Zichtbaar vanaf&quot; in het beheer).
              </p>
            ) : null}
            {upcoming.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-500 rounded-lg border-2 border-slate-500 bg-slate-950 shadow-lg ring-1 ring-slate-400/30">
                {upcoming.map((m) => {
                  const param = toMeetParamYmd(m.meetup_date);
                  return (
                    <li key={m.id} className="bg-slate-900/80">
                      <Link
                        href={`/event?meet=${param}`}
                        className="block px-4 py-3.5 no-underline transition-colors hover:bg-slate-800"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="!font-semibold !text-white">{formatDutchLongDate(m.meetup_date)}</span>
                          <span className="!text-sm !font-semibold !text-teal-300">{m.event_title}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs !text-slate-200">{m.venue_line}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
