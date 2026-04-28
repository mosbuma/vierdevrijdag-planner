import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MeetingEditor } from "@/components/MeetingEditor";

type P = { params: Promise<{ id: string }> };

export default async function EditMeetingPage({ params }: P) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) notFound();
  const [meeting, posters] = await Promise.all([
    prisma.meeting.findUnique({
      where: { id: nid },
      include: {
        tracks: { orderBy: { sort_order: "asc" } },
        items: { orderBy: [{ sort_order: "asc" }, { id: "asc" }], include: { track: true } },
      },
    }),
    prisma.poster.findMany({
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!meeting) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Meetup bewerken</h1>
      <MeetingEditor
        meeting={JSON.parse(JSON.stringify(meeting))}
        posters={JSON.parse(JSON.stringify(posters))}
        isAdmin={ctx.isAdmin}
      />
    </div>
  );
}
