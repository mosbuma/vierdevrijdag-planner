/** Stable UTC noon for MySQL DATE columns. */
export function dateFromYmd(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}
