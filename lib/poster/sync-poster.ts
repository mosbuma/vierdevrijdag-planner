import path from "node:path";
import { toAmsterdamYmd } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { formatTimeFromDb, writePosterJpeg, type PosterProgramLine } from "@/lib/poster/generate-poster";
import { parseStoredPosterRegions } from "@/lib/poster/poster-regions";
import { posterFileAbsolutePath } from "@/lib/poster/poster-storage-path";

type ItemWithTrack = {
  id: number;
  track_id: number;
  sort_order: number;
  slot_start: Date;
  slot_end: Date;
  description: string;
  row_description_html: string | null;
  speakers: string | null;
  track: { name: string; sort_order: number };
};

const POSTER_DESC_MAX = 200;

/** Strip rich text to a single line for the JPEG (tags removed, length capped). */
export function stripHtmlToPosterLine(html: string | null | undefined, maxLen: number): string {
  if (html == null || !String(html).trim()) return "";
  let t = String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, "");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > maxLen) return `${t.slice(0, maxLen - 1)}…`;
  return t;
}

function posterLineDescription(desc: string, rowHtml: string | null | undefined): string {
  const short = (desc ?? "").trim();
  if (short) {
    if (short.length > POSTER_DESC_MAX) return `${short.slice(0, POSTER_DESC_MAX - 1)}…`;
    return short;
  }
  const fromRich = stripHtmlToPosterLine(rowHtml, POSTER_DESC_MAX);
  return fromRich;
}

/** Track order (admin sort_order), then clock time, then item order — not raw `track_id`. */
export function sortProgramItemsForPoster<
  T extends { track_id: number; slot_start: Date; sort_order: number; id: number },
>(items: T[], tracks: { id: number; sort_order: number }[]): T[] {
  const trackOrder = new Map(tracks.map((t) => [t.id, t.sort_order]));
  const minutes = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
  return [...items].sort((a, b) => {
    const oa = trackOrder.get(a.track_id) ?? 0;
    const ob = trackOrder.get(b.track_id) ?? 0;
    if (oa !== ob) return oa - ob;
    const ma = minutes(a.slot_start);
    const mb = minutes(b.slot_start);
    if (ma !== mb) return ma - mb;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.id - b.id;
  });
}

export function buildPosterProgramLinesFromItems(items: ItemWithTrack[], multiTrack: boolean): PosterProgramLine[] {
  return items.map((it) => {
    const s = formatTimeFromDb(it.slot_start);
    const e = formatTimeFromDb(it.slot_end);
    const timeRange = `${s} – ${e}`;
    const line: PosterProgramLine = {
      timeRange,
      description: posterLineDescription(it.description, it.row_description_html),
      speaker: it.speakers?.trim() || undefined,
    };
    if (multiTrack) {
      line.trackLabel = it.track.name;
    }
    return line;
  });
}

export async function syncPosterForMeeting(meetingId: number): Promise<void> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      poster: true,
      tracks: { orderBy: { sort_order: "asc" } },
      items: {
        orderBy: [{ track_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
        include: { track: true },
      },
    },
  });
  if (!meeting) return;

  const tracks = meeting.tracks;
  const multiTrack = tracks.length > 1;

  const orderedItems = sortProgramItemsForPoster(meeting.items, tracks);
  const programLines = buildPosterProgramLinesFromItems(orderedItems, multiTrack);

  const ymd = toAmsterdamYmd(meeting.meetup_date).replace(/-/g, "");
  const rel = `generated/posters/${ymd}.jpg`;
  const outAbs = posterFileAbsolutePath(rel);

  const poster = meeting.poster;
  const regions = parseStoredPosterRegions(poster.title_region, poster.program_region);
  const relTemplate = poster.template_rel_path.replace(/^\//, "");
  const templateAbs = path.join(process.cwd(), "public", relTemplate);

  await writePosterJpeg(
    {
      width: 937,
      height: 1678,
      eventTitle: meeting.event_title,
      meetupDate: meeting.meetup_date,
      venueLine: meeting.venue_line,
      programLines,
      regions,
    },
    outAbs,
    templateAbs
  );

  // Always touch `updated_at` so `/event` cache-bust (`?v=`) changes even when `poster_rel_path`
  // is unchanged. Prisma may skip no-op `update()`s, which left browsers serving stale JPEGs.
  await prisma.$executeRaw`
    UPDATE meetings
    SET poster_rel_path = ${rel}, updated_at = CURRENT_TIMESTAMP(0)
    WHERE id = ${meetingId}
  `;
}
