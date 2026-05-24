#!/usr/bin/env node
/**
 * Backfill nostr_event_id / nostr_d_tag / nostr_published_at for meetings
 * that are public but not yet on Nostr. Requires the app to be running.
 *
 * Usage:
 *   node scripts/nostr-backfill.mjs              # upcoming public meetups only
 *   node scripts/nostr-backfill.mjs --include-past
 *
 * Reads NOSTR_CRON_TOKEN and NEXTAUTH_URL from .env in the project root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnvFile(envPath);

const token = process.env.NOSTR_CRON_TOKEN?.trim();
const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
const includePast = process.argv.includes("--include-past");

if (!token) {
  console.error("NOSTR_CRON_TOKEN is not set in .env");
  process.exit(1);
}

const url = `${base}/api/nostr/cron/backfill${includePast ? "?includePast=1" : ""}`;

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Backfill failed:", body.error ?? res.statusText);
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
if (body.hint) {
  console.error("\nHint:", body.hint);
}
if (Array.isArray(body.attempted) && body.attempted.length === 0 && body.skipped) {
  const s = body.skipped;
  console.error(
    `Skipped: ${s.alreadyPublished?.length ?? 0} already on Nostr, ${s.pastMeetups?.length ?? 0} past (use --include-past), ${s.notYetVisible?.length ?? 0} not yet public.`,
  );
}
