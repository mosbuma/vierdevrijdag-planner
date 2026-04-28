/** Build Prisma TIME value from "HH:mm" or "H:mm". */
export function parseTimeToDb(hhmm: string): Date {
  const [hRaw, mRaw] = hhmm.trim().split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59 || h < 0 || h > 23) {
    throw new Error("Invalid time");
  }
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}
