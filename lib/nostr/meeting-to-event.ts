import type { Meeting, MeetingTrack, ProgramItem } from "@prisma/client";
import { formatDutchLongDate, toAmsterdamYmd, toMeetParamYmd } from "@/lib/dates";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
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

export function meetingDTag(meetupDate: Date): string {
  const ymd = toAmsterdamYmd(meetupDate).replace(/-/g, "");
  return `${getNostrEventDTagPrefix()}-${ymd}`;
}

export function calendarCollectionDTag(): string {
  return getNostrCalendarCollectionDTag();
}

export function calendarCollectionTitle(): string {
  return getNostrCalendarCollectionTitle();
}

function slotTimesFromItems(items: ItemWithTrack[]): { start: string; end: string } {
  if (items.length === 0) {
    return { start: getNostrMeetupDefaultStart(), end: getNostrMeetupDefaultEnd() };
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

export function meetingToCalendarEventInput(
  meeting: Meeting,
  items: ItemWithTrack[],
  tracks: MeetingTrack[],
): TimeBasedCalendarEventInput {
  const timezone = getNostrTimezone();
  const ymd = toAmsterdamYmd(meeting.meetup_date);
  const { start, end } = slotTimesFromItems(items);
  const startUnix = localDateTimeToUnix(ymd, start, timezone);
  const endUnix = localDateTimeToUnix(ymd, end, timezone);
  const meetParam = toMeetParamYmd(meeting.meetup_date);
  const eventUrl = `${getPublicSiteOrigin()}/event?meet=${meetParam}`;
  const posterUrl = meeting.poster_rel_path
    ? `${getPublicSiteOrigin()}/${meeting.poster_rel_path.replace(/^\//, "")}`
    : undefined;

  return {
    identifier: meetingDTag(meeting.meetup_date),
    title: meeting.event_title,
    summary: summaryFromHtml(meeting.program_description_html),
    description: buildPlainDescription(meeting, items, tracks, eventUrl),
    startUnix,
    endUnix: endUnix > startUnix ? endUnix : startUnix + 3600,
    timezone,
    location: meeting.venue_line,
    image: posterUrl,
    hashtags: getEventHashtags(),
  };
}
