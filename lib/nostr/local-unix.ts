/** Wall-clock date + time in an IANA timezone → Unix seconds. */
export function localDateTimeToUnix(ymd: string, hhmm: string, timezone: string): number {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const want = `${ymd}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;

  const low = Math.floor(Date.UTC(y, mo - 1, d, h - 3, mi) / 1000);
  const high = Math.floor(Date.UTC(y, mo - 1, d, h + 3, mi) / 1000);

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  for (let ts = low; ts <= high; ts += 60) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(ts * 1000)).map((p) => [p.type, p.value]));
    let hour = parts.hour ?? "00";
    if (hour === "24") hour = "00";
    const got = `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
    if (got === want) return ts;
  }

  return Math.floor(Date.UTC(y, mo - 1, d, h - 1, mi) / 1000);
}

export function dayBucketsForRange(startUnix: number, endUnix: number): string[] {
  const startDay = Math.floor(startUnix / 86_400);
  const endDay = Math.floor(endUnix / 86_400);
  const days: string[] = [];
  for (let day = startDay; day <= endDay; day++) {
    days.push(String(day));
  }
  return days;
}
