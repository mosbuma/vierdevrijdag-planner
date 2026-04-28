import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { toAmsterdamYmd } from "@/lib/dates";
import { TEMPLATE_EDITOR_DUMMY_MEETING_ID } from "@/lib/poster/dummy-template-preview-constants";
import { prisma } from "@/lib/prisma";
import { PosterTemplateEditor } from "@/components/PosterTemplateEditor";

type P = { params: Promise<{ id: string }> };

export default async function EditPosterPage({ params }: P) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const nid = Number(id);
  if (!Number.isFinite(nid)) notFound();

  const [poster, meetings] = await Promise.all([
    prisma.poster.findUnique({ where: { id: nid } }),
    prisma.meeting.findMany({
      orderBy: { meetup_date: "desc" },
      select: { id: true, meetup_date: true, event_title: true, is_template: true },
    }),
  ]);
  if (!poster) notFound();

  const meetingChoices =
    meetings.length === 0
      ? [{ id: TEMPLATE_EDITOR_DUMMY_MEETING_ID, label: "Dummy (voorbeeldmeetup)" }]
      : meetings.map((m) => ({
          id: m.id,
          label: `${m.is_template ? "Sjabloon — " : ""}${toAmsterdamYmd(m.meetup_date)} — ${m.event_title}`,
        }));

  return (
    <div>
      <p className="mb-2">
        <Link href="/admin/posters" className="text-sm text-teal-400 hover:underline">
          ← Posters
        </Link>
      </p>
      <h1 className="text-2xl font-bold text-white">Poster bewerken</h1>
      <div className="mt-6">
        <PosterTemplateEditor
          poster={JSON.parse(JSON.stringify(poster))}
          meetingChoices={JSON.parse(JSON.stringify(meetingChoices))}
        />
      </div>
    </div>
  );
}
