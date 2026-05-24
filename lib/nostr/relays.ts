import { getNostrRelays } from "@/lib/nostr/config";

export function getRelays(): string[] {
  return getNostrRelays();
}
