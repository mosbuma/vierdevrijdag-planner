import { getAuthContext } from "@/lib/auth";
import { PublicLoginCorner } from "@/components/PublicLoginCorner";
import { NostrEventsPageClient } from "@/components/NostrEventsPageClient";
import { getNip05Identifier } from "@/lib/nostr/nip05";
import { tryLoadServerPubkey } from "@/lib/nostr/keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NostrEventsPage() {
  const ctx = await getAuthContext();
  const showLogin = !ctx;
  const canDelete = Boolean(ctx?.isAdmin);
  const nip05Id = await getNip05Identifier().catch(() => null);
  const key = tryLoadServerPubkey();

  return (
    <>
      {showLogin ? <PublicLoginCorner /> : null}
      <NostrEventsPageClient
        nip05Id={nip05Id}
        npub={key?.npub ?? null}
        canDelete={canDelete}
        showLoginPadding={showLogin}
      />
    </>
  );
}
