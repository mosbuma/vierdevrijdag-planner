"use client";

import { useCallback, useEffect, useState } from "react";
import { NostrEventsViewer } from "@/components/NostrEventsViewer";
import { NostrLoadingSpinner } from "@/components/NostrLoadingSpinner";
import type { SerializableNostrEvent } from "@/lib/nostr/fetch-author-events";

type Props = {
  nip05Id: string | null;
  npub: string | null;
  canDelete: boolean;
  showLoginPadding: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | {
      status: "ok";
      npub: string;
      relays: string[];
      relayErrors: string[];
      events: SerializableNostrEvent[];
    };

export function NostrEventsPageClient({ nip05Id, npub, canDelete, showLoginPadding }: Props) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoad({ status: "loading" });
    }

    try {
      const res = await fetch("/api/nostr/events", { cache: "no-store" });
      const data = (await res.json()) as
        | { ok: false; error: string }
        | {
            ok: true;
            npub: string;
            relays: string[];
            relayErrors: string[];
            events: SerializableNostrEvent[];
          };

      if (!res.ok || !data.ok) {
        setLoad({
          status: "error",
          error: data.ok === false ? data.error : "Events laden mislukt",
        });
        return;
      }

      setLoad({
        status: "ok",
        npub: data.npub,
        relays: data.relays,
        relayErrors: data.relayErrors,
        events: data.events,
      });
    } catch {
      setLoad({ status: "error", error: "Netwerkfout bij laden van events" });
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents(false);
  }, [loadEvents]);

  const isInitialLoading = load.status === "loading";
  const showSpinner = isInitialLoading || refreshing;

  return (
    <main className={showLoginPadding ? "pt-14" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Nostr-events</h1>
          <p className="mt-2 text-sm text-slate-400">
            Alle events van{" "}
            {npub ? <code className="break-all text-slate-300">{npub}</code> : "—"}
            {nip05Id ? (
              <>
                {" "}
                · NIP-05 <code className="text-teal-300">{nip05Id}</code>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          disabled={isInitialLoading || refreshing}
          onClick={() => void loadEvents(true)}
        >
          {refreshing ? "Vernieuwen…" : "Vernieuwen"}
        </button>
      </div>

      {showSpinner ? (
        <NostrLoadingSpinner label={refreshing ? "Events vernieuwen…" : undefined} />
      ) : null}

      {!showSpinner && load.status === "error" ? (
        <p className="mt-6 rounded border border-red-800/60 bg-red-950/40 px-4 py-3 text-red-100">
          {load.error}
        </p>
      ) : null}

      {!showSpinner && load.status === "ok" ? (
        <>
          {load.relayErrors.length > 0 ? (
            <p className="mt-4 rounded border border-amber-700/60 bg-amber-950/35 px-3 py-2 text-sm text-amber-100">
              Sommige relays faalden ({load.relayErrors.length}/{load.relays.length}). Resultaten kunnen
              onvolledig zijn.
            </p>
          ) : null}

          <p className="mt-4 text-sm text-slate-400">
            {load.events.length} event{load.events.length === 1 ? "" : "s"} van {load.relays.length} relay
            {load.relays.length === 1 ? "" : "s"}.
          </p>

          {load.events.length === 0 ? (
            <p className="mt-6 text-slate-500">Geen events gevonden op de relays.</p>
          ) : (
            <NostrEventsViewer events={load.events} canDelete={canDelete} />
          )}
        </>
      ) : null}
    </main>
  );
}
