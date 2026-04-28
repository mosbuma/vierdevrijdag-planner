import { prisma } from "@/lib/prisma";
import { syncPosterForMeeting } from "@/lib/poster/sync-poster";

/** Regenerate JPEG for every meetup that uses this poster template. */
export async function syncAllMeetingsForPoster(posterId: number): Promise<void> {
  const meetings = await prisma.meeting.findMany({
    where: { poster_id: posterId, is_template: false },
    select: { id: true },
  });
  for (const m of meetings) {
    await syncPosterForMeeting(m.id);
  }
}
