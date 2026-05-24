"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  meetingId: number;
  visibleFromYmd: string;
  isPubliclyVisible: boolean;
  isTemplate?: boolean;
  nostrEventId: string | null;
  nostrPublishedAt: string | null;
  nostrLastError: string | null;
};

export function PublishToNostrButton({
  meetingId,
  visibleFromYmd,
  isPubliclyVisible,
  isTemplate,
  nostrEventId,
  nostrPublishedAt,
  nostrLastError,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (isTemplate) return null;

  async function publish() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/nostr/publish-meeting/${meetingId}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string; acceptedRelays?: string[] };
      if (!res.ok) {
        setMsg(data.error ?? "Publiceren mislukt");
        return;
      }
      const n = data.acceptedRelays?.length ?? 0;
      setMsg(`Gepubliceerd (${n} relay${n === 1 ? "" : "s"}). Event: ${data.id?.slice(0, 16)}…`);
      router.refresh();
    } catch {
      setMsg("Netwerkfout bij publiceren");
    } finally {
      setLoading(false);
    }
  }

  const label = nostrEventId ? "Opnieuw publiceren op Nostr" : "Publiceren op Nostr";

  return (
    <div className="rounded border border-slate-700 bg-slate-900/50 p-4">
      <h3 className="font-semibold text-white">Nostr (NIP-52)</h3>
      <p className="mt-1 text-sm text-slate-400">
        Kalender-event op relays als <code className="text-teal-300">meetup@vierdevrijdag.org</code>.
      </p>
      {nostrPublishedAt ? (
        <p className="mt-2 text-xs text-slate-400">
          Laatst gepubliceerd: {new Date(nostrPublishedAt).toLocaleString("nl-NL")}
          {nostrEventId ? (
            <>
              {" "}
              — <span className="font-mono text-slate-300">{nostrEventId.slice(0, 16)}…</span>
            </>
          ) : null}
        </p>
      ) : null}
      {nostrLastError ? <p className="mt-2 text-xs text-amber-300">Laatste fout: {nostrLastError}</p> : null}
      {msg ? <p className="mt-2 text-sm text-teal-300">{msg}</p> : null}
      <button
        type="button"
        className="mt-3"
        disabled={loading || !isPubliclyVisible}
        onClick={() => void publish()}
        title={
          !isPubliclyVisible
            ? `Pas publiceerbaar vanaf ${visibleFromYmd} (zichtbaar vanaf)`
            : undefined
        }
      >
        {loading ? "Bezig…" : label}
      </button>
      {!isPubliclyVisible ? (
        <p className="mt-2 text-xs text-slate-500">
          Publiceren kan pas vanaf <strong className="text-slate-300">{visibleFromYmd}</strong> (zichtbaar vanaf).
        </p>
      ) : null}
    </div>
  );
}
