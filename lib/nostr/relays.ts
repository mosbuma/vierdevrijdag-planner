import { getNostrRelays } from "@/lib/nostr/config";

export async function getRelays(): Promise<string[]> {
  return getNostrRelays();
}
