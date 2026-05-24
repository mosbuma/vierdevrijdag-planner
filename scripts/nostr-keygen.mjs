#!/usr/bin/env node
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { nsecEncode, npubEncode } from "nostr-tools/nip19";

const sk = generateSecretKey();
const pk = getPublicKey(sk);

console.log("Add to .env:");
console.log(`NOSTR_NPUB=${npubEncode(pk)}`);
console.log(`NOSTR_NSEC=${nsecEncode(sk)}  # keep secret, never commit`);
