import { getPublicKey } from "nostr-tools/pure";
import { decode, npubEncode } from "nostr-tools/nip19";

export type ServerNostrKey = {
  skBytes: Uint8Array;
  pkHex: string;
  npub: string;
};

export type ServerNostrPubkey = {
  pkHex: string;
  npub: string;
};

let cachedSigning: ServerNostrKey | null = null;
let cachedPubkey: ServerNostrPubkey | null = null;

/** Parse NOSTR_NPUB (bech32 npub or 64-char hex). */
export function parseNostrPubkeyFromEnv(): ServerNostrPubkey | null {
  const raw = process.env.NOSTR_NPUB?.trim();
  if (!raw) return null;

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    const pkHex = raw.toLowerCase();
    return { pkHex, npub: npubEncode(pkHex) };
  }

  const decoded = decode(raw);
  if (decoded.type !== "npub") {
    throw new Error("NOSTR_NPUB must be a bech32 npub or 64-character hex pubkey");
  }
  const pkHex = decoded.data.toLowerCase();
  return { pkHex, npub: npubEncode(pkHex) };
}

/** Public key for NIP-05 and display: NOSTR_NPUB if set, otherwise derived from NOSTR_NSEC. */
export function tryLoadServerPubkey(): ServerNostrPubkey | null {
  if (cachedPubkey) return cachedPubkey;

  const fromEnv = parseNostrPubkeyFromEnv();
  if (fromEnv) {
    cachedPubkey = fromEnv;
    return fromEnv;
  }

  try {
    const signing = loadServerKey();
    cachedPubkey = { pkHex: signing.pkHex, npub: signing.npub };
    return cachedPubkey;
  } catch {
    return null;
  }
}

function assertPubkeyMatchesNsec(derivedPkHex: string): void {
  const fromEnv = parseNostrPubkeyFromEnv();
  if (!fromEnv) return;
  if (fromEnv.pkHex !== derivedPkHex) {
    throw new Error("NOSTR_NPUB does not match the public key derived from NOSTR_NSEC");
  }
}

/** Signing key (requires NOSTR_NSEC). Validates against NOSTR_NPUB when both are set. */
export function loadServerKey(): ServerNostrKey {
  if (cachedSigning) return cachedSigning;

  const raw = process.env.NOSTR_NSEC?.trim();
  if (!raw) {
    throw new Error("NOSTR_NSEC is not configured");
  }
  const decoded = decode(raw);
  if (decoded.type !== "nsec") {
    throw new Error("NOSTR_NSEC must be a bech32 nsec value");
  }
  const pkHex = getPublicKey(decoded.data);
  const npub = npubEncode(pkHex);
  assertPubkeyMatchesNsec(pkHex);

  cachedSigning = { skBytes: decoded.data, pkHex, npub };
  cachedPubkey = { pkHex, npub };
  return cachedSigning;
}

export function tryLoadServerKey(): ServerNostrKey | null {
  try {
    return loadServerKey();
  } catch {
    return null;
  }
}
