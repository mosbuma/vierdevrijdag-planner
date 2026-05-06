import { formatTimeFromDb } from "@/lib/poster/generate-poster";
import { toMeetParamYmd } from "@/lib/dates";
import { sanitizeMeetingDescriptionHtml } from "@/lib/meeting-html";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

const TZ = "Europe/Amsterdam";

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(s: string): string {
  return escapeHtmlText(s);
}

/**
 * Dutch date for `{date}` metatag: "22 mei" in the event's year when it matches the
 * current calendar year in Amsterdam, otherwise "22 mei 2026".
 */
export function formatDutchMeetupMetatagDate(meetupDate: Date, now: Date = new Date()): string {
  const yMeet = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(meetupDate),
  );
  const yNow = Number(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(now));
  if (yMeet === yNow) {
    return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, day: "numeric", month: "long" }).format(meetupDate);
  }
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(meetupDate);
}

export type ProgramRowForMetatag = {
  id: number;
  sort_order: number;
  slot_start: Date;
  /** Poster column — short label on the same line as the time. */
  description: string;
  row_description_html: string | null;
};

function slotStartMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Clock order first (matches how the schedule reads); then DB order as tiebreaker. */
function sortProgramRowsForMetatag(rows: ProgramRowForMetatag[]) {
  return [...rows].sort((a, b) => {
    const ma = slotStartMinutes(a.slot_start);
    const mb = slotStartMinutes(b.slot_start);
    if (ma !== mb) return ma - mb;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.id - b.id;
  });
}

/**
 * Each row: `HH:mm title` (poster description), then rich explanation flush below;
 * spacing only between whole rows, not between title line and explanation.
 */
export function buildProgramMetatagHtml(rows: ProgramRowForMetatag[]): string {
  const blocks: string[] = [];
  for (const it of sortProgramRowsForMetatag(rows)) {
    const body = sanitizeMeetingDescriptionHtml(it.row_description_html);
    const title = (it.description ?? "").trim();
    if (!title && !body) continue;

    const t = formatTimeFromDb(it.slot_start);
    const headHtml = title
      ? `<span class="tabular-nums">${escapeHtmlText(t)}</span> ${escapeHtmlText(title)}`
      : `<span class="tabular-nums">${escapeHtmlText(t)}</span>`;
    const descHtml = body
      ? `<div class="vdv-prog-desc mt-0 text-slate-300 [&_a]:text-teal-400 [&>*:first-child]:mt-0 [&_p]:mb-2 [&_p:last-child]:mb-0">${body}</div>`
      : "";
    blocks.push(
      `<div class="vdv-prog-item mb-12 last:mb-0"><div class="vdv-prog-head block font-semibold leading-snug text-slate-200">${headHtml}</div>${descHtml}</div>`,
    );
  }
  return blocks.join("");
}

export type ExpandMeetingDescriptionOptions = {
  /** `meetings.venue_line` (Locatie in admin). Substituted for `{location}`. */
  venueLine?: string | null;
  now?: Date;
};

/** After the meeting description HTML has been sanitized, substitute placeholders. */
export function expandMeetingDescriptionPlaceholders(
  sanitizedHtml: string,
  meetupDate: Date,
  programRows: ProgramRowForMetatag[],
  options?: ExpandMeetingDescriptionOptions | Date,
): string {
  const opts: ExpandMeetingDescriptionOptions =
    options instanceof Date ? { now: options } : (options ?? {});
  const now = opts.now;
  const dateLabel = formatDutchMeetupMetatagDate(meetupDate, now);
  const prog = buildProgramMetatagHtml(programRows);
  const origin = getPublicSiteOrigin();
  const eventUrl = `${origin}/event?meet=${toMeetParamYmd(meetupDate)}`;
  const programLinkHtml = `<a href="${escapeHtmlAttr(eventUrl)}" rel="noopener noreferrer" target="_blank">${escapeHtmlText(
    eventUrl,
  )}</a>`;
  const locationHtml = escapeHtmlText((opts.venueLine ?? "").trim());
  return sanitizedHtml
    .split("{date}")
    .join(dateLabel)
    .split("{program}")
    .join(prog)
    .split("{programlink}")
    .join(programLinkHtml)
    .split("{location}")
    .join(locationHtml);
}
