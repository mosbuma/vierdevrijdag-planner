import { getNip05Domain, getNip05Identifier, getNostrProfileName } from "@/lib/nostr/config";
import { getRelays } from "@/lib/nostr/relays";
import { tryLoadServerPubkey } from "@/lib/nostr/keys";

export { getNip05Domain, getNip05Identifier };

export function getNip05ProfileName(): string {
  return getNostrProfileName();
}

export function buildNip05Json(): { names: Record<string, string>; relays: Record<string, string[]> } | null {
  const key = tryLoadServerPubkey();
  if (!key) return null;

  try {
    const name = getNostrProfileName();
    return {
      names: { [name]: key.pkHex },
      relays: { [key.pkHex]: getRelays() },
    };
  } catch {
    return null;
  }
}
