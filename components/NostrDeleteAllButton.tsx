"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NostrDeleteAllButton({ eventCount }: { eventCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function deleteAll() {
    if (
      !window.confirm(
        `Verwijderverzoeken sturen voor alle ${eventCount} events op de relays (behalve eerdere verwijderverzoeken)?`,
      )
    ) {
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/nostr/delete-all-events", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        attempted?: number;
        succeeded?: number;
        failed?: { eventId: string; kind: number; error: string }[];
      };
      if (!res.ok) {
        setMsg(data.error ?? "Alles verwijderen mislukt");
        return;
      }
      const failed = data.failed?.length ?? 0;
      setMsg(
        `${data.succeeded ?? 0} van ${data.attempted ?? 0} verwijderverzoeken verstuurd` +
          (failed > 0 ? ` (${failed} mislukt).` : "."),
      );
      router.refresh();
    } catch {
      setMsg("Netwerkfout");
    } finally {
      setLoading(false);
    }
  }

  if (eventCount === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="bg-red-900 hover:bg-red-800"
        disabled={loading}
        onClick={() => void deleteAll()}
      >
        {loading ? "Bezig…" : "Verwijder alles"}
      </button>
      {msg ? <span className="text-sm text-slate-400">{msg}</span> : null}
    </div>
  );
}
