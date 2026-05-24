import { getNostrEventHashtags } from "@/lib/nostr/config";

export async function getEventHashtags(): Promise<string[]> {
  return getNostrEventHashtags();
}
