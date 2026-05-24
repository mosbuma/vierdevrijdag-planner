"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  eventId: string;
  kind: number;
  dTag: string | null;
};

export function NostrEventDeleteButton({ eventId, kind, dTag }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function deleteEvent() {
    const label = dTag ? `${kind}:${dTag}` : `kind ${kind}`;
    if (!window.confirm(`Nostr-verwijderverzoek sturen voor ${label}?`)) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/nostr/delete-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, kind, dTag }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
        acceptedRelays?: string[];
      };
      if (!res.ok) {
        setMsg(data.error ?? "Verwijderen mislukt");
        return;
      }
      const n = data.acceptedRelays?.length ?? 0;
      setMsg(`Verwijderverzoek verstuurd (${n} relay${n === 1 ? "" : "s"}).`);
      router.refresh();
    } catch {
      setMsg("Netwerkfout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-w-[7rem] flex-col gap-1">
      <button
        type="button"
        className="bg-red-900 text-sm hover:bg-red-800"
        disabled={loading}
        onClick={() => void deleteEvent()}
      >
        {loading ? "Bezig…" : "Verwijderen"}
      </button>
      {msg ? <span className="text-xs text-slate-400">{msg}</span> : null}
    </div>
  );
}
