import { getNostrEventHashtags } from "@/lib/nostr/config";

export function getEventHashtags(): string[] {
  return getNostrEventHashtags();
}
