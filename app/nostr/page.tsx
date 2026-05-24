import { getAuthContext } from "@/lib/auth";
import { PublicLoginCorner } from "@/components/PublicLoginCorner";
import { NostrEventsTable } from "@/components/NostrEventsTable";
import { fetchAuthorEventsFromRelays } from "@/lib/nostr/fetch-author-events";
import { getNip05Identifier } from "@/lib/nostr/nip05";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NostrEventsPage() {
  const ctx = await getAuthContext();
  const showLogin = !ctx?.user;
  const canDelete = Boolean(ctx?.isAdmin);
  const result = await fetchAuthorEventsFromRelays();

  return (
    <>
      {showLogin ? <PublicLoginCorner /> : null}
      <main className={`mx-auto max-w-6xl px-4 py-8 ${showLogin ? "pt-14" : ""}`}>
        <h1 className="text-2xl font-bold text-white">Nostr-events</h1>
        <p className="mt-2 text-sm text-slate-400">
          Events gepubliceerd door{" "}
          <code className="text-teal-300">{getNip05Identifier()}</code>
          {result.ok ? (
            <>
              {" "}
              (<code className="text-slate-300">{result.npub}</code>)
            </>
          ) : null}
        </p>

        {!result.ok ? (
          <p className="mt-6 rounded border border-red-800/60 bg-red-950/40 px-4 py-3 text-red-100">
            {result.error}
          </p>
        ) : (
          <>
            {result.relayErrors.length > 0 ? (
              <p className="mt-4 rounded border border-amber-700/60 bg-amber-950/35 px-3 py-2 text-sm text-amber-100">
                Sommige relays faalden ({result.relayErrors.length}/{result.relays.length}). Resultaten kunnen
                onvolledig zijn.
              </p>
            ) : null}

            <p className="mt-4 text-sm text-slate-400">
              {result.events.length} event{result.events.length === 1 ? "" : "s"} van {result.relays.length} relay
              {result.relays.length === 1 ? "" : "s"}.
            </p>

            {result.events.length === 0 ? (
              <p className="mt-6 text-slate-500">Geen events gevonden op de relays.</p>
            ) : (
              <NostrEventsTable events={result.events} canDelete={canDelete} />
            )}
          </>
        )}
      </main>
    </>
  );
}
