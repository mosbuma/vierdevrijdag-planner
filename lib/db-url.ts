/**
 * If the DB host is wrong or firewalled, the TCP handshake can hang for a long time.
 * mysql2 respects `connect_timeout` (seconds) on the URL; Prisma passes it through.
 */
export function withDefaultMysqlUrlParams(url: string | undefined): string | undefined {
  if (!url) return url;
  if (!/^mysql:\/\//i.test(url)) return url;
  if (/[?&]connect_timeout=/i.test(url)) return url;
  return url.includes("?") ? `${url}&connect_timeout=10` : `${url}?connect_timeout=10`;
}
