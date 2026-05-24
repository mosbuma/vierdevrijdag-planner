import type { Meeting, MeetingTrack, ProgramItem } from "@prisma/client";
import { formatDutchLongDate, toAmsterdamYmd, toMeetParamYmd } from "@/lib/dates";
import { getNostrContentSiteOrigin } from "@/lib/nostr/config";
import { localDateTimeToUnix } from "@/lib/nostr/local-unix";
import type { TimeBasedCalendarEventInput } from "@/lib/nostr/event-builder";
import {
  getNostrCalendarCollectionDTag,
  getNostrCalendarCollectionTitle,
  getNostrEventDTagPrefix,
  getNostrMeetupDefaultEnd,
  getNostrMeetupDefaultStart,
  getNostrTimezone,
} from "@/lib/nostr/config";
import { getEventHashtags } from "@/lib/nostr/event-hashtags";
import {
  buildPosterProgramLinesFromItems,
  sortProgramItemsForPoster,
  stripHtmlToPosterLine,
} from "@/lib/poster/sync-poster";
import { formatTimeFromDb } from "@/lib/poster/generate-poster";

type ItemWithTrack = ProgramItem & { track: MeetingTrack };

export async function meetingDTag(meetupDate: Date): Promise<string> {
  const ymd = toAmsterdamYmd(meetupDate).replace(/-/g, "");
  const prefix = await getNostrEventDTagPrefix();
  return `${prefix}-${ymd}`;
}

export async function calendarCollectionDTag(): Promise<string> {
  return getNostrCalendarCollectionDTag();
}

export async function calendarCollectionTitle(): Promise<string> {
  return getNostrCalendarCollectionTitle();
}

async function slotTimesFromItems(items: ItemWithTrack[]): Promise<{ start: string; end: string }> {
  if (items.length === 0) {
    return {
      start: await getNostrMeetupDefaultStart(),
      end: await getNostrMeetupDefaultEnd(),
    };
  }
  let minStart = 24 * 60;
  let maxEnd = 0;
  for (const it of items) {
    const s = formatTimeFromDb(it.slot_start);
    const e = formatTimeFromDb(it.slot_end);
    const sm = Number(s.split(":")[0]) * 60 + Number(s.split(":")[1]);
    const em = Number(e.split(":")[0]) * 60 + Number(e.split(":")[1]);
    if (sm < minStart) minStart = sm;
    if (em > maxEnd) maxEnd = em;
  }
  const fmt = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  return { start: fmt(minStart), end: fmt(maxEnd) };
}

function summaryFromHtml(html: string | null | undefined): string | undefined {
  const text = stripHtmlToPosterLine(html, 280);
  return text || undefined;
}

function buildPlainDescription(
  meeting: Meeting,
  items: ItemWithTrack[],
  tracks: MeetingTrack[],
  eventUrl: string,
): string {
  const lines: string[] = [];
  lines.push(formatDutchLongDate(meeting.meetup_date));
  lines.push(meeting.venue_line);
  lines.push("");

  const body = stripHtmlToPosterLine(meeting.program_description_html, 4000);
  if (body) {
    lines.push(body);
    lines.push("");
  }

  const multiTrack = tracks.length > 1;
  const ordered = sortProgramItemsForPoster(items, tracks);
  const programLines = buildPosterProgramLinesFromItems(ordered, multiTrack);
  if (programLines.length > 0) {
    lines.push("Programma:");
    for (const pl of programLines) {
      let row = `${pl.timeRange} — ${pl.description}`;
      if (pl.trackLabel) row = `[${pl.trackLabel}] ${row}`;
      if (pl.speaker) row += ` (${pl.speaker})`;
      lines.push(row);
    }
    lines.push("");
  }

  lines.push(eventUrl);
  return lines.join("\n");
}

export async function meetingToCalendarEventInput(
  meeting: Meeting,
  items: ItemWithTrack[],
  tracks: MeetingTrack[],
): Promise<TimeBasedCalendarEventInput> {
  const timezone = await getNostrTimezone();
  const ymd = toAmsterdamYmd(meeting.meetup_date);
  const { start, end } = await slotTimesFromItems(items);
  const startUnix = localDateTimeToUnix(ymd, start, timezone);
  const endUnix = localDateTimeToUnix(ymd, end, timezone);
  const meetParam = toMeetParamYmd(meeting.meetup_date);
  const siteOrigin = await getNostrContentSiteOrigin();
  const eventUrl = `${siteOrigin}/event?meet=${meetParam}`;
  const posterUrl = meeting.poster_rel_path
    ? `${siteOrigin}/${meeting.poster_rel_path.replace(/^\//, "")}`
    : undefined;

  return {
    identifier: await meetingDTag(meeting.meetup_date),
    title: meeting.event_title,
    summary: summaryFromHtml(meeting.program_description_html),
    description: buildPlainDescription(meeting, items, tracks, eventUrl),
    startUnix,
    endUnix: endUnix > startUnix ? endUnix : startUnix + 3600,
    timezone,
    location: meeting.venue_line,
    image: posterUrl,
    hashtags: await getEventHashtags(),
  };
}
