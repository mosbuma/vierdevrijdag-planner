import { getNip05Domain, getNip05Identifier, getNostrProfileName } from "@/lib/nostr/config";
import { getRelays } from "@/lib/nostr/relays";
import { tryLoadServerPubkey } from "@/lib/nostr/keys";

export { getNip05Domain, getNip05Identifier };

export async function getNip05ProfileName(): Promise<string> {
  return getNostrProfileName();
}

export async function buildNip05Json(): Promise<{
  names: Record<string, string>;
  relays: Record<string, string[]>;
} | null> {
  const key = tryLoadServerPubkey();
  if (!key) return null;

  try {
    const name = await getNostrProfileName();
    const relays = await getRelays();
    return {
      names: { [name]: key.pkHex },
      relays: { [key.pkHex]: relays },
    };
  } catch {
    return null;
  }
}
