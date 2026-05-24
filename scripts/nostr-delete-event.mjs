#!/usr/bin/env node
/**
 * Publish a NIP-09 kind:5 deletion request for an addressable event you authored.
 *
 * Usage:
 *   node scripts/nostr-delete-event.mjs <eventId> <kind> <d-tag>
 *
 * Example (calendar collection):
 *   node scripts/nostr-delete-event.mjs 99ca9a5f... 31924 vierdevrijdag-meetups
 *
 * Example (meetup event):
 *   node scripts/nostr-delete-event.mjs abc123... 31923 vierdevrijdag-20260626
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeEvent } from "nostr-tools/pure";
import { decode } from "nostr-tools/nip19";
import { SimplePool } from "nostr-tools/pool";

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

const [eventId, kindRaw, dTag] = process.argv.slice(2);
const kind = Number(kindRaw);

if (!eventId || !Number.isFinite(kind) || !dTag) {
  console.error("Usage: node scripts/nostr-delete-event.mjs <eventId> <kind> <d-tag>");
  process.exit(1);
}

const nsec = process.env.NOSTR_NSEC?.trim();
const relaysRaw = process.env.NOSTR_RELAYS?.trim();
if (!relaysRaw) {
  console.error("NOSTR_RELAYS is not set in .env");
  process.exit(1);
}
const relays = relaysRaw.split(",").map((r) => r.trim()).filter(Boolean);
if (relays.length === 0) {
  console.error("NOSTR_RELAYS must contain at least one relay URL");
  process.exit(1);
}

if (!nsec) {
  console.error("NOSTR_NSEC is not set in .env");
  process.exit(1);
}

const decoded = decode(nsec);
if (decoded.type !== "nsec") {
  console.error("NOSTR_NSEC must be a bech32 nsec");
  process.exit(1);
}

const sk = decoded.data;
const { getPublicKey } = await import("nostr-tools/pure");
const pkHex = getPublicKey(sk);
const aTag = `${kind}:${pkHex}:${dTag}`;

const unsigned = {
  kind: 5,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ["e", eventId],
    ["a", aTag],
    ["k", String(kind)],
  ],
  content: process.env.NOSTR_DELETION_REASON?.trim() || "Deleted via vierdevrijdag.org",
};

const signed = finalizeEvent(unsigned, sk);
const pool = new SimplePool();

let ok = 0;
await Promise.all(
  relays.map(async (relay) => {
    try {
      await Promise.all(pool.publish([relay], signed));
      ok++;
      console.log("OK", relay);
    } catch (e) {
      console.warn("FAIL", relay, e instanceof Error ? e.message : e);
    }
  }),
);

pool.close(relays);

console.log("");
console.log("Deletion request id:", signed.id);
console.log("Target:", aTag);
if (ok === 0) {
  console.error("No relay accepted the deletion request.");
  process.exit(1);
}
