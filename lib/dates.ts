const TZ = "Europe/Amsterdam";

/** YYYY-MM-DD in Amsterdam for "now" */
export function amsterdamTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-DD for a Date interpreted in Amsterdam calendar day */
export function toAmsterdamYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** `meet` query value for `/event` (YYYYMMDD, Amsterdam calendar day). */
export function toMeetParamYmd(d: Date): string {
  return toAmsterdamYmd(d).replace(/-/g, "");
}

export function parseYmdToUtcDate(ymd: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) return null;
  return d;
}

export function formatDutchLongDate(d: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function isMeetingPublicVisible(visibleFrom: Date, todayYmd: string): boolean {
  const vf = toAmsterdamYmd(visibleFrom);
  return vf <= todayYmd;
}

export function isMeetupUpcomingOrToday(meetupDate: Date, todayYmd: string): boolean {
  const md = toAmsterdamYmd(meetupDate);
  return md >= todayYmd;
}
