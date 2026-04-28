import type { Meeting } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { amsterdamTodayYmd, isMeetingPublicVisible, toAmsterdamYmd } from "@/lib/dates";

export async function getLatestVisibleMeeting() {
  const upcoming = await getVisibleUpcomingMeetings();
  return upcoming[0] ?? null;
}

/**
 * Publiek zichtbare meetups vanaf vandaag (Amsterdam), oudste eerst.
 * Filtert op kalenderdagen in Europe/Amsterdam (niet op Prisma/MySQL DATE vs UTC-noon vergelijkingen).
 */
export async function getVisibleUpcomingMeetings(): Promise<Meeting[]> {
  const { visible } = await getPublicMeetupLists();
  return visible;
}

/** Toekomstige echte meetups die nog niet publiek mogen (visible_from na vandaag). */
export async function getUpcomingNotYetPublicMeetings(): Promise<Meeting[]> {
  const { notYetPublic } = await getPublicMeetupLists();
  return notYetPublic;
}

/** Eén query; gebruik op de homepage i.p.v. los `getVisible` + `getNotYetPublic` aan te roepen. */
export async function getPublicMeetupLists(): Promise<{ visible: Meeting[]; notYetPublic: Meeting[] }> {
  const today = amsterdamTodayYmd();
  const rows = await prisma.meeting.findMany({
    where: { is_template: false },
    orderBy: { meetup_date: "asc" },
  });
  const visible: Meeting[] = [];
  const notYetPublic: Meeting[] = [];
  for (const m of rows) {
    const meetYmd = toAmsterdamYmd(m.meetup_date);
    const visYmd = toAmsterdamYmd(m.visible_from);
    if (meetYmd < today) continue;
    if (visYmd <= today) visible.push(m);
    else notYetPublic.push(m);
  }
  return { visible, notYetPublic };
}

export type PublicMeetingByYmdResult =
  | { ok: true; meeting: Meeting }
  | { ok: false; error: "invalid" | "notfound" | "notyet" };

/**
 * Publieke meetup op kalenderdatum (YYYY-MM-DD in Amsterdam), uit `meet=YYYYMMDD` of `meet=YYYY-MM-DD`.
 * Zoekt op `toAmsterdamYmd(meetup_date)` i.p.v. Prisma `findUnique` + UTC-noon `Date` (voorkomt mismatches).
 */
export async function getMeetingByYmdPublic(raw: string): Promise<PublicMeetingByYmdResult> {
  const compact = raw.trim().replace(/\D/g, "");
  if (compact.length !== 8) return { ok: false, error: "invalid" };
  const key = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const today = amsterdamTodayYmd();
  const rows = await prisma.meeting.findMany({
    where: { is_template: false },
  });
  const meet = rows.find((r) => toAmsterdamYmd(r.meetup_date) === key);
  if (!meet) return { ok: false, error: "notfound" };
  if (!isMeetingPublicVisible(meet.visible_from, today)) return { ok: false, error: "notyet" };
  return { ok: true, meeting: meet };
}

export function meetingCacheBustPath(posterRelPath: string | null, updatedAt: Date): string {
  if (!posterRelPath) return "";
  const v = updatedAt.getTime();
  return `/${posterRelPath}?v=${v}`;
}
