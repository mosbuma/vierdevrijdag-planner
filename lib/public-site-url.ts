/** Publieke basis-URL (geen trailing slash). Gebruikt `NEXTAUTH_URL`; anders localhost voor dev. */
export function getPublicSiteOrigin(): string {
  const raw = process.env.NEXTAUTH_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}
