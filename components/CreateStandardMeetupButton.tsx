"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateStandardMeetupButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/meetings/from-template", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof data.error === "string" ? data.error : "Aanmaken mislukt");
        return;
      }
      const id = typeof data.id === "number" ? data.id : null;
      if (id != null) router.push(`/meetings/${id}/edit`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="rounded bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
        disabled={busy}
        onClick={() => void onClick()}
      >
        {busy ? "Bezig…" : "Standaardmeetup aanmaken"}
      </button>
      {msg ? <p className="max-w-md text-sm text-red-400">{msg}</p> : null}
      <p className="max-w-lg text-xs text-slate-500">
        Kopieert programma en instellingen van de sjabloonmeetup naar een nieuwe meetup op de eerstvolgende vierde vrijdag na de laatste echte meetup (of na vandaag als alleen het sjabloon bestaat).
      </p>
    </div>
  );
}
