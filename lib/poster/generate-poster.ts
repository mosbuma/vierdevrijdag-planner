import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeXml } from "@/lib/poster/escape-xml";
import { formatDutchLongDate } from "@/lib/dates";
import { mergePosterRegions, type PosterRegions } from "@/lib/poster/poster-regions";

export type PosterProgramLine = {
  timeRange: string;
  description: string;
  trackLabel?: string;
  speaker?: string;
};

export type PosterInput = {
  width: number;
  height: number;
  eventTitle: string;
  meetupDate: Date;
  venueLine: string;
  programLines: PosterProgramLine[];
  /** When omitted, defaults are used. */
  regions?: Partial<PosterRegions> | null;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatTimeFromDb(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

const C_TITLE = "#ffffff";
const C_ACCENT_YELLOW = "#ffeb52";
const C_BULLET = "#2ec4b6";
const C_LINE = "#ffffff";
const C_SPEAKER = "#9be7ff";
const C_VENUE = "#ffeb52";
const C_DIVIDER = "rgba(241,245,249,0.82)";

const FONT_STACK = "DejaVu Sans, Helvetica Neue, Helvetica, Arial, sans-serif";

function approxTextWidth(str: string, fontSize: number, weight: 400 | 600 | 700): number {
  const ratio = weight >= 700 ? 0.58 : weight >= 600 ? 0.56 : 0.52;
  return str.length * fontSize * ratio;
}

/** Thin space + en dash + thin space (matches single-line title markup). */
const TITLE_DATE_SEP = "\u2009\u2013\u2009";

function fitTitleInRect(
  eventTitle: string,
  dateLong: string,
  innerW: number,
  innerH: number
): { fontSize: number; wrapDate: boolean } {
  const single = `${eventTitle}${TITLE_DATE_SEP}${dateLong}`;
  const maxFs = Math.min(innerH * 0.42, innerW * 0.12);
  for (let fs = Math.floor(maxFs); fs >= 11; fs--) {
    if (approxTextWidth(single, fs, 700) <= innerW && fs * 1.05 <= innerH) {
      return { fontSize: fs, wrapDate: false };
    }
  }
  for (let fs = Math.floor(maxFs); fs >= 11; fs--) {
    const w1 = approxTextWidth(eventTitle, fs, 700);
    const w2 = approxTextWidth(`\u2013\u2009${dateLong}`, fs, 700);
    if (w1 <= innerW && w2 <= innerW && fs * 2.35 <= innerH) {
      return { fontSize: fs, wrapDate: true };
    }
  }
  return { fontSize: 11, wrapDate: true };
}

function buildTitleSvg(
  W: number,
  H: number,
  r: PosterRegions["title"],
  eventTitle: string,
  dateLong: string
): string {
  const x0 = r.x * W;
  const y0 = r.y * H;
  const w0 = r.w * W;
  const h0 = r.h * H;
  const pad = Math.min(w0, h0) * 0.08;
  const innerW = Math.max(20, w0 - 2 * pad);
  const innerH = Math.max(20, h0 - 2 * pad);
  const { fontSize, wrapDate } = fitTitleInRect(eventTitle, dateLong, innerW, innerH);
  const lineH = fontSize * 1.22;
  const cx = x0 + w0 / 2;
  const cy = y0 + h0 / 2;
  const textAttrs = `font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="700" letter-spacing="-0.01em" text-anchor="middle" dominant-baseline="central"`;

  if (!wrapDate) {
    return `<text x="${cx}" y="${cy}" xml:space="preserve" ${textAttrs}><tspan fill="${C_TITLE}">${escapeXml(eventTitle)}</tspan><tspan fill="${C_ACCENT_YELLOW}">&#x2009;&#x2013;&#x2009;</tspan><tspan fill="${C_ACCENT_YELLOW}">${escapeXml(dateLong)}</tspan></text>`;
  }
  const y1 = cy - lineH / 2;
  const y2 = cy + lineH / 2;
  return `<text x="${cx}" y="${y1}" xml:space="preserve" ${textAttrs}><tspan fill="${C_TITLE}">${escapeXml(eventTitle)}</tspan></text><text x="${cx}" y="${y2}" xml:space="preserve" ${textAttrs}><tspan fill="${C_ACCENT_YELLOW}">&#x2013;&#x2009;${escapeXml(dateLong)}</tspan></text>`;
}

function programLinePlain(row: PosterProgramLine): string {
  let main = "";
  if (row.trackLabel) main += `[${row.trackLabel}] `;
  main += `${row.timeRange} – ${row.description}`;
  const sp = row.speaker?.trim();
  if (sp) return `${main} door ${sp}`;
  return main;
}

function maxFontForProgramLines(
  rows: string[],
  innerW: number,
  startFs: number
): number {
  let fs = Math.floor(startFs);
  while (fs > 7) {
    if (rows.every((s) => approxTextWidth(s, fs, 400) <= innerW)) return fs;
    fs -= 1;
  }
  return 7;
}

function buildProgramSvg(
  W: number,
  H: number,
  r: PosterRegions["program"],
  venueLine: string,
  programLines: PosterProgramLine[]
): string {
  const x0 = r.x * W;
  const y0 = r.y * H;
  const w0 = r.w * W;
  const h0 = r.h * H;
  const pad = Math.min(w0, h0) * 0.04;
  const innerW = Math.max(24, w0 - 2 * pad);
  const textX = x0 + pad;
  const lineX2 = x0 + w0 - pad;

  let venueFs = Math.min(H * 0.034, h0 * 0.11, innerW / Math.max(venueLine.length * 0.42, 6));
  venueFs = Math.max(10, venueFs);
  while (venueFs > 9 && approxTextWidth(venueLine, venueFs, 700) > innerW) venueFs -= 0.5;

  const gapAboveDivider = Math.min(h0 * 0.025, 14);
  const gapBelowDivider = Math.min(h0 * 0.022, 12);
  const venueBaseline = y0 + h0 - pad;
  const dividerY = venueBaseline - venueFs * 1.05 - gapBelowDivider;
  const listBottom = dividerY - gapAboveDivider;

  let yCursor = y0 + pad;
  let svg = "";

  const maxRows = Math.min(programLines.length, 24);
  const listAvailH = Math.max(16, listBottom - yCursor);

  if (maxRows > 0) {
    const plainRows = programLines.slice(0, maxRows).map(programLinePlain);
    const lineStepGuess = listAvailH / maxRows;
    let fontLine = Math.min(lineStepGuess * 0.68, W * 0.028);
    fontLine = maxFontForProgramLines(plainRows, innerW, fontLine);
    const lineStep = Math.min(listAvailH / maxRows, fontLine * 1.35);
    fontLine = Math.min(fontLine, lineStep * 0.72);

    programLines.slice(0, maxRows).forEach((row, i) => {
      const yy = yCursor + i * lineStep + fontLine * 0.82;
      if (yy > listBottom) return;
      let main = "";
      if (row.trackLabel) main += `[${row.trackLabel}] `;
      main += `${row.timeRange} – ${row.description}`;
      const mainEsc = escapeXml(main);
      const sp = row.speaker?.trim();
      if (sp) {
        const spEsc = escapeXml(sp);
        svg += `<text x="${textX}" y="${yy}" xml:space="preserve" font-family="${FONT_STACK}" font-size="${Math.round(fontLine * 10) / 10}" font-weight="400"><tspan fill="${C_BULLET}">•</tspan><tspan fill="${C_LINE}"> </tspan><tspan fill="${C_LINE}">${mainEsc}</tspan><tspan fill="${C_LINE}"> door </tspan><tspan fill="${C_SPEAKER}">${spEsc}</tspan></text>`;
      } else {
        svg += `<text x="${textX}" y="${yy}" xml:space="preserve" font-family="${FONT_STACK}" font-size="${Math.round(fontLine * 10) / 10}" font-weight="400"><tspan fill="${C_BULLET}">•</tspan><tspan fill="${C_LINE}"> ${mainEsc}</tspan></text>`;
      }
    });
  }

  svg += `<line x1="${textX}" y1="${dividerY}" x2="${lineX2}" y2="${dividerY}" stroke="${C_DIVIDER}" stroke-width="${Math.max(1.5, W * 0.0022)}"/>`;
  svg += `<text x="${textX}" y="${venueBaseline}" fill="${C_VENUE}" font-family="${FONT_STACK}" font-size="${Math.round(venueFs * 10) / 10}" font-weight="700" letter-spacing="-0.01em">${escapeXml(venueLine)}</text>`;

  return svg;
}

function buildSvg(input: PosterInput): string {
  const W = input.width;
  const H = input.height;
  const regions = mergePosterRegions(input.regions);
  const dateLong = formatDutchLongDate(input.meetupDate);

  const titlePart = buildTitleSvg(W, H, regions.title, input.eventTitle, dateLong);
  const programPart = buildProgramSvg(W, H, regions.program, input.venueLine, input.programLines);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${titlePart}
  ${programPart}
</svg>`;
}

export async function writePosterJpeg(
  input: PosterInput,
  outAbsolutePath: string,
  templateAbsolutePath?: string
): Promise<void> {
  const templatePath =
    templateAbsolutePath?.trim() ||
    process.env.POSTER_TEMPLATE_PATH?.trim() ||
    path.join(process.cwd(), "public", "template.png");
  const base = sharp(templatePath);
  const meta = await base.metadata();
  const W = meta.width ?? input.width;
  const H = meta.height ?? input.height;
  const sized: PosterInput = { ...input, width: W, height: H };
  const svg = buildSvg(sized);
  const overlay = await sharp(Buffer.from(svg, "utf-8")).resize(W, H).png().toBuffer();
  await fs.mkdir(path.dirname(outAbsolutePath), { recursive: true });
  // `toFile()` can leave stale trailing bytes on some FS/NAS setups when the new JPEG is
  // shorter than the old one; `writeFile` truncates and fully replaces the file (same as delete+regen).
  const jpegBuf = await sharp(templatePath)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
  await fs.writeFile(outAbsolutePath, jpegBuf);
}
