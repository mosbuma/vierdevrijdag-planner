import path from "node:path";
import { toAmsterdamYmd } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { formatTimeFromDb, writePosterJpeg, type PosterProgramLine } from "@/lib/poster/generate-poster";
import { parseStoredPosterRegions } from "@/lib/poster/poster-regions";
import { posterFileAbsolutePath } from "@/lib/poster/poster-storage-path";

type ItemWithTrack = {
  slot_start: Date;
  slot_end: Date;
  description: string;
  speakers: string | null;
  track: { name: string };
};

export function buildPosterProgramLinesFromItems(items: ItemWithTrack[], multiTrack: boolean): PosterProgramLine[] {
  return items.map((it) => {
    const s = formatTimeFromDb(it.slot_start);
    const e = formatTimeFromDb(it.slot_end);
    const timeRange = `${s} – ${e}`;
    const line: PosterProgramLine = {
      timeRange,
      description: it.description,
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

  const programLines = buildPosterProgramLinesFromItems(meeting.items, multiTrack);

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

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { poster_rel_path: rel },
  });
}
