import { amsterdamTodayYmd } from "@/lib/dates";

/** Europe/Amsterdam weekday for Gregorian y-m-d using UTC noon (stable vs DST). */
function isFridayAmsterdam(y: number, month: number, day: number): boolean {
  const ut = Date.UTC(y, month - 1, day, 12, 0, 0);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
  }).format(new Date(ut));
  return wd === "Fri";
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, month: number): number {
  const md = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(y)) return 29;
  return md[month - 1] ?? 0;
}

/** Next calendar day as YYYY-MM-DD (Gregorian). */
export function addOneCalendarDay(ymd: string): string {
  const [y0, m0, d0] = ymd.split("-").map(Number);
  const dim = daysInMonth(y0, m0);
  let y = y0;
  let m = m0;
  let d = d0 + 1;
  if (d > dim) {
    d = 1;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Fourth Friday of month (1–12), or null if the month has fewer than four Fridays. */
export function fourthFridayYmd(year: number, month: number): string | null {
  const dim = daysInMonth(year, month);
  let n = 0;
  for (let day = 1; day <= dim; day++) {
    if (!isFridayAmsterdam(year, month, day)) continue;
    n++;
    if (n === 4) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

/**
 * First fourth-Friday date in an Amsterdam calendar month that is on or after `startYmd`.
 * Scans up to 36 months forward.
 */
export function nextFourthFridayOnOrAfter(startYmd: string): string {
  const [ys, ms] = startYmd.split("-").map(Number);
  let y = ys;
  let mo = ms;
  for (let i = 0; i < 36; i++) {
    const ff = fourthFridayYmd(y, mo);
    if (ff && ff >= startYmd) return ff;
    mo++;
    if (mo > 12) {
      mo = 1;
      y++;
    }
  }
  throw new Error("Geen vierde vrijdag gevonden in de komende 36 maanden.");
}

/**
 * Next series meetup date: fourth Friday strictly after the last real meetup,
 * or strictly after today (Amsterdam) when only the template meetup exists.
 */
export function nextMeetupYmdFromSchedule(opts: {
  lastRealMeetupYmd: string | null;
  hasAnyRealMeetup: boolean;
}): string {
  const startExclusive = opts.hasAnyRealMeetup
    ? addOneCalendarDay(opts.lastRealMeetupYmd!)
    : addOneCalendarDay(amsterdamTodayYmd());
  return nextFourthFridayOnOrAfter(startExclusive);
}

/**
 * Publiek-zichtbaar-vanaf: drie kalendermaanden vóór de meetupdag (dag naar beneden afgerond
 * als die dag in de doelmaand niet bestaat, bijv. 31 mei → 28/29 februari).
 */
export function visibleFromThreeMonthsBeforeMeetupYmd(meetupYmd: string): string {
  const [y, m, d] = meetupYmd.split("-").map(Number);
  let nm = m - 3;
  let ny = y;
  while (nm < 1) {
    nm += 12;
    ny -= 1;
  }
  const dim = daysInMonth(ny, nm);
  const dd = Math.min(d, dim);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}
