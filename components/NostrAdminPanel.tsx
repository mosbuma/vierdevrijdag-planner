"use client";

import { useState } from "react";

type Props = {
  nip05Id: string | null;
};

export function NostrAdminPanel({ nip05Id }: Props) {
  const [profileLoading, setProfileLoading] = useState(false);
  const [republishLoading, setRepublishLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [republishMsg, setRepublishMsg] = useState<string | null>(null);
  const [includePast, setIncludePast] = useState(true);

  async function publishProfile() {
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/admin/nostr/publish-profile", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) {
        setProfileMsg(data.error ?? "Profiel publiceren mislukt");
        return;
      }
      setProfileMsg(`Profiel gepubliceerd (kind:0). Event: ${data.id?.slice(0, 16)}…`);
    } catch {
      setProfileMsg("Netwerkfout");
    } finally {
      setProfileLoading(false);
    }
  }

  async function republishAll() {
    setRepublishLoading(true);
    setRepublishMsg(null);
    try {
      const q = includePast ? "" : "?includePast=0";
      const res = await fetch(`/api/admin/nostr/republish-all${q}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        attempted?: number[];
        succeeded?: number[];
        failed?: { id: number; error: string }[];
        skippedNotVisible?: number[];
      };
      if (!res.ok) {
        setRepublishMsg(data.error ?? "Opnieuw publiceren mislukt");
        return;
      }
      const n = data.succeeded?.length ?? 0;
      const f = data.failed?.length ?? 0;
      const skip = data.skippedNotVisible?.length ?? 0;
      let msg = `${n} meetup${n === 1 ? "" : "s"} opnieuw gepubliceerd.`;
      if (f > 0) msg += ` ${f} mislukt.`;
      if (skip > 0) msg += ` ${skip} overgeslagen (nog niet publiek).`;
      setRepublishMsg(msg);
    } catch {
      setRepublishMsg("Netwerkfout");
    } finally {
      setRepublishLoading(false);
    }
  }

  const busy = profileLoading || republishLoading;

  return (
    <div className="mt-4 rounded border border-slate-700 bg-slate-900/40 p-4">
      <h2 className="text-sm font-semibold text-white">Nostr</h2>
      <p className="mt-1 text-sm text-slate-400">
        Profiel (kind:0) met NIP-05{" "}
        {nip05Id ? (
          <code className="text-teal-300">{nip05Id}</code>
        ) : (
          <span className="text-amber-300">(niet geconfigureerd)</span>
        )}{" "}
        en meetup-events (kind:31923) op relays.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => void publishProfile()}>
          {profileLoading ? "Bezig…" : "Publiceer profiel"}
        </button>
        <button type="button" disabled={busy} onClick={() => void republishAll()}>
          {republishLoading ? "Bezig…" : "Alle meetups opnieuw publiceren"}
        </button>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={includePast}
          onChange={(e) => setIncludePast(e.target.checked)}
          disabled={busy}
          className="rounded border-slate-600"
        />
        Inclusief verleden meetups (publiek zichtbaar)
      </label>

      {profileMsg ? <p className="mt-2 text-sm text-teal-300">{profileMsg}</p> : null}
      {republishMsg ? <p className="mt-2 text-sm text-teal-300">{republishMsg}</p> : null}
    </div>
  );
}
