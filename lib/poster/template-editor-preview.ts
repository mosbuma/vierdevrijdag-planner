import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  POSTER_TEMPLATE_DUMMY_MEETUP,
  TEMPLATE_EDITOR_DUMMY_MEETING_ID,
  templateEditorPreviewRelPath,
} from "@/lib/poster/dummy-template-preview-constants";
import { writePosterJpeg, type PosterProgramLine } from "@/lib/poster/generate-poster";
import { parseStoredPosterRegions } from "@/lib/poster/poster-regions";
import { buildPosterProgramLinesFromItems } from "@/lib/poster/sync-poster";

const DUMMY_PROGRAM_LINES: PosterProgramLine[] = [
  { timeRange: "19:00 – 19:15", description: "Inloop" },
  { timeRange: "19:15 – 20:00", description: "Sessie" },
];

export { templateEditorPreviewRelPath, TEMPLATE_EDITOR_DUMMY_MEETING_ID } from "@/lib/poster/dummy-template-preview-constants";

/**
 * Renders a preview JPEG: current poster template (regions + base image) with either the dummy
 * meetup (meetingId === TEMPLATE_EDITOR_DUMMY_MEETING_ID) or a real meetup's content.
 */
export async function renderTemplateEditorPreview(posterTemplateId: number, meetingId: number): Promise<string> {
  const poster = await prisma.poster.findUnique({ where: { id: posterTemplateId } });
  if (!poster) throw new Error("Poster template not found");
  const regions = parseStoredPosterRegions(poster.title_region, poster.program_region);
  const relTemplate = poster.template_rel_path.replace(/^\//, "");
  const templateAbs = path.join(process.cwd(), "public", relTemplate);
  const outRel = templateEditorPreviewRelPath(posterTemplateId);
  const outAbs = path.join(process.cwd(), "public", outRel);

  let eventTitle: string;
  let meetupDate: Date;
  let venueLine: string;
  let programLines: PosterProgramLine[];

  if (meetingId === TEMPLATE_EDITOR_DUMMY_MEETING_ID) {
    eventTitle = POSTER_TEMPLATE_DUMMY_MEETUP.event_title;
    meetupDate = new Date(`${POSTER_TEMPLATE_DUMMY_MEETUP.meetup_date}T12:00:00.000Z`);
    venueLine = POSTER_TEMPLATE_DUMMY_MEETUP.venue_line;
    programLines = DUMMY_PROGRAM_LINES;
  } else {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        tracks: { orderBy: { sort_order: "asc" } },
        items: {
          orderBy: [{ track_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
          include: { track: true },
        },
      },
    });
    if (!meeting) throw new Error("Meetup niet gevonden");
    const multiTrack = meeting.tracks.length > 1;
    programLines = buildPosterProgramLinesFromItems(meeting.items, multiTrack);
    eventTitle = meeting.event_title;
    meetupDate = meeting.meetup_date;
    venueLine = meeting.venue_line;
  }

  await writePosterJpeg(
    {
      width: 937,
      height: 1678,
      eventTitle,
      meetupDate,
      venueLine,
      programLines,
      regions,
    },
    outAbs,
    templateAbs
  );
  return outRel;
}
