import { prisma } from "@/lib/prisma";
import { dateFromYmd } from "@/lib/date-parse";
import { toAmsterdamYmd } from "@/lib/dates";
import { nextMeetupYmdFromSchedule, visibleFromThreeMonthsBeforeMeetupYmd } from "@/lib/fourth-friday";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";

export type CreateFromTemplateResult =
  | { ok: true; meetingId: number; meetupYmd: string }
  | {
      ok: false;
      error: "no_template" | "multiple_templates" | "date_taken" | "schedule_error";
      message: string;
    };

export async function createMeetingFromTemplate(): Promise<CreateFromTemplateResult> {
  const templates = await prisma.meeting.findMany({
    where: { is_template: true },
    orderBy: { id: "asc" },
  });
  if (templates.length === 0) {
    return { ok: false, error: "no_template", message: "Geen sjabloonmeetup gevonden (is_template)." };
  }
  if (templates.length > 1) {
    return {
      ok: false,
      error: "multiple_templates",
      message: "Er mag precies één sjabloonmeetup zijn (is_template).",
    };
  }
  const templateId = templates[0]!.id;

  const lastReal = await prisma.meeting.findFirst({
    where: { is_template: false },
    orderBy: { meetup_date: "desc" },
    select: { meetup_date: true },
  });
  const hasAnyRealMeetup = lastReal != null;
  const lastRealMeetupYmd = lastReal ? toAmsterdamYmd(lastReal.meetup_date) : null;

  let meetupYmd: string;
  try {
    meetupYmd = nextMeetupYmdFromSchedule({ lastRealMeetupYmd, hasAnyRealMeetup });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Datum berekenen mislukt.";
    return { ok: false, error: "schedule_error", message: msg };
  }

  const visibleYmd = visibleFromThreeMonthsBeforeMeetupYmd(meetupYmd);
  const meetupDate = dateFromYmd(meetupYmd);
  const visibleFrom = dateFromYmd(visibleYmd);

  const taken = await prisma.meeting.findUnique({
    where: { meetup_date: meetupDate },
    select: { id: true },
  });
  if (taken) {
    return {
      ok: false,
      error: "date_taken",
      message: `Er bestaat al een meetup op ${meetupYmd} (vierde vrijdag).`,
    };
  }

  const full = await prisma.meeting.findUnique({
    where: { id: templateId },
    include: {
      tracks: { orderBy: { sort_order: "asc" } },
      items: { orderBy: [{ sort_order: "asc" }, { id: "asc" }] },
    },
  });
  if (!full) {
    return { ok: false, error: "no_template", message: "Sjabloonmeetup niet gevonden." };
  }

  const newMeetingId = await prisma.$transaction(async (tx) => {
    const m = await tx.meeting.create({
      data: {
        meetup_date: meetupDate,
        visible_from: visibleFrom,
        venue_line: full.venue_line,
        event_title: full.event_title,
        poster_id: full.poster_id,
        poster_rel_path: null,
        is_template: false,
      },
    });

    const trackIdMap = new Map<number, number>();
    for (const tr of full.tracks) {
      const nt = await tx.meetingTrack.create({
        data: {
          meeting_id: m.id,
          name: tr.name,
          sort_order: tr.sort_order,
        },
      });
      trackIdMap.set(tr.id, nt.id);
    }

    for (const it of full.items) {
      const newTrackId = trackIdMap.get(it.track_id);
      if (newTrackId == null) continue;
      await tx.programItem.create({
        data: {
          meeting_id: m.id,
          track_id: newTrackId,
          slot_start: it.slot_start,
          slot_end: it.slot_end,
          description: it.description,
          speakers: it.speakers,
          sort_order: it.sort_order,
        },
      });
    }

    return m.id;
  });

  await syncPosterForMeeting(newMeetingId);

  return { ok: true, meetingId: newMeetingId, meetupYmd };
}
