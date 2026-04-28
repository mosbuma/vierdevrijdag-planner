"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Track = { id: number; name: string; sort_order: number };
type Item = {
  id: number;
  track_id: number;
  slot_start: string;
  slot_end: string;
  description: string;
  speakers: string | null;
  sort_order: number;
};
type Meeting = {
  id: number;
  meetup_date: string;
  visible_from: string;
  venue_line: string;
  event_title: string;
  poster_id: number;
  poster_rel_path: string | null;
  is_template?: boolean;
  tracks: Track[];
  items: Item[];
};

type PosterOption = { id: number; name: string };

type Draft = { start: string; end: string; desc: string; speakers: string };
type ProgramSortKey = "slot_start" | "slot_end" | "track" | "description" | "speakers";

function isoDate(d: string) {
  return d.slice(0, 10);
}

function timeFromIso(iso: string) {
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  if (!t) return "00:00";
  const [h, m] = t.replace("Z", "").split(":");
  return `${h.padStart(2, "0")}:${(m ?? "00").slice(0, 2)}`;
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + mins;
  total = Math.min(Math.max(0, total), 23 * 60 + 59);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function sortTrackItems(list: Item[]) {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function sortTracksList(list: Track[]) {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function defaultDraftForTrack(trackId: number, allItems: Item[]): Draft {
  const list = sortTrackItems(allItems.filter((i) => i.track_id === trackId));
  if (list.length === 0) return { start: "19:00", end: "19:30", desc: "", speakers: "" };
  const lastEnd = list[list.length - 1].slot_end;
  return { start: lastEnd, end: addMinutes(lastEnd, 30), desc: "", speakers: "" };
}

function trackTie(a: Item, b: Item, trackMeta: Map<number, Track>): number {
  const ta = trackMeta.get(a.track_id);
  const tb = trackMeta.get(b.track_id);
  const so = (ta?.sort_order ?? 0) - (tb?.sort_order ?? 0);
  if (so !== 0) return so;
  return (ta?.name ?? "").localeCompare(tb?.name ?? "", "nl") || a.id - b.id;
}

function compareProgramRows(
  a: Item,
  b: Item,
  trackMeta: Map<number, Track>,
  primary: ProgramSortKey,
  dir: "asc" | "desc"
): number {
  const m = dir === "asc" ? 1 : -1;
  let cmp = 0;
  if (primary === "slot_start") {
    cmp = minutes(a.slot_start) - minutes(b.slot_start);
  } else if (primary === "slot_end") {
    cmp = minutes(a.slot_end) - minutes(b.slot_end);
  } else if (primary === "track") {
    cmp = trackTie(a, b, trackMeta);
  } else if (primary === "description") {
    cmp = a.description.localeCompare(b.description, "nl", { sensitivity: "base" });
  } else if (primary === "speakers") {
    cmp = (a.speakers ?? "").localeCompare(b.speakers ?? "", "nl", { sensitivity: "base" });
  }
  cmp *= m;
  if (cmp !== 0) return cmp;
  const startCmp = minutes(a.slot_start) - minutes(b.slot_start);
  if (startCmp !== 0) return startCmp;
  return trackTie(a, b, trackMeta);
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => void onClick()}
      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded border border-slate-600 bg-slate-800 p-0 text-slate-300 hover:border-teal-600 hover:bg-slate-700 hover:text-teal-200 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function IconEdit() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUp() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="18 15 12 9 6 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDown() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  children,
}: {
  label: string;
  sortKey: ProgramSortKey;
  activeKey: ProgramSortKey;
  dir: "asc" | "desc";
  onSort: (k: ProgramSortKey) => void;
  children?: React.ReactNode;
}) {
  const active = activeKey === sortKey;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <button
        type="button"
        className={`flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide sm:text-sm ${
          active ? "text-teal-300" : "text-slate-400 hover:text-white"
        }`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        {active ? <span aria-hidden>{dir === "asc" ? "↑" : "↓"}</span> : null}
      </button>
      {children}
    </div>
  );
}

export function MeetingEditor({
  meeting,
  posters,
  isAdmin,
}: {
  meeting: Meeting;
  posters: PosterOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [meetup_date, setMeetup] = useState(isoDate(meeting.meetup_date));
  const [visible_from, setVis] = useState(isoDate(meeting.visible_from));
  const [venue_line, setVenue] = useState(meeting.venue_line);
  const [event_title, setTitle] = useState(meeting.event_title);
  const [poster_id, setPosterId] = useState(meeting.poster_id);
  const [items, setItems] = useState<Item[]>(() =>
    meeting.items.map((it) => ({
      ...it,
      slot_start: timeFromIso(it.slot_start as unknown as string),
      slot_end: timeFromIso(it.slot_end as unknown as string),
    }))
  );
  const [tracks, setTracks] = useState<Track[]>(() => sortTracksList(meeting.tracks));
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<ProgramSortKey>("slot_start");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [trackFilterId, setTrackFilterId] = useState<number | "all">("all");
  const [newDraft, setNewDraft] = useState(() => {
    const tid = meeting.tracks[0]?.id ?? 0;
    const base = meeting.items.map((it) => ({
      ...it,
      slot_start: timeFromIso(it.slot_start as unknown as string),
      slot_end: timeFromIso(it.slot_end as unknown as string),
    }));
    return { track_id: tid, ...defaultDraftForTrack(tid, base) };
  });
  const [newTrackName, setNewTrackName] = useState("");
  /** Bumps after a successful poster regen so the preview image refetches (same path, new file). */
  const [posterPreviewKey, setPosterPreviewKey] = useState(0);
  const [posterRegenerating, setPosterRegenerating] = useState(false);

  useEffect(() => {
    setTracks(sortTracksList(meeting.tracks));
  }, [meeting.tracks]);

  useEffect(() => {
    setPosterId(meeting.poster_id);
  }, [meeting.poster_id]);

  useEffect(() => {
    setItems(
      meeting.items.map((it) => ({
        ...it,
        slot_start: timeFromIso(it.slot_start as unknown as string),
        slot_end: timeFromIso(it.slot_end as unknown as string),
      }))
    );
  }, [meeting.items]);

  const soleTrackId = tracks.length === 1 ? tracks[0]?.id : undefined;
  useEffect(() => {
    if (soleTrackId === undefined) return;
    setTrackFilterId("all");
    setNewDraft((p) => ({ ...p, track_id: soleTrackId }));
    setSortKey((k) => (k === "track" ? "slot_start" : k));
  }, [soleTrackId]);

  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  const displayedItems = useMemo(() => {
    let list = items;
    if (trackFilterId !== "all") list = list.filter((i) => i.track_id === trackFilterId);
    return [...list].sort((a, b) => compareProgramRows(a, b, trackMap, sortKey, sortDir));
  }, [items, trackFilterId, trackMap, sortKey, sortDir]);

  function onProgramSort(key: ProgramSortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetup_date, visible_from, venue_line, event_title, poster_id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Opslaan mislukt");
      return;
    }
    // PATCH regenerates the JPEG (same path as before); bust cache so the new template shows immediately.
    setPosterPreviewKey((k) => k + 1);
    router.refresh();
    setMsg("Opgeslagen.");
  }

  async function regeneratePosterJpeg() {
    setMsg(null);
    setPosterRegenerating(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/poster/regenerate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Poster genereren mislukt");
        return;
      }
      setPosterPreviewKey((k) => k + 1);
      router.refresh();
      setMsg("Poster opnieuw gegenereerd.");
    } finally {
      setPosterRegenerating(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`/api/meetings/${meeting.id}/program-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        track_id: newDraft.track_id,
        slot_start: newDraft.start,
        slot_end: newDraft.end,
        description: newDraft.desc,
        speakers: newDraft.speakers || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Item mislukt");
      return;
    }
    const endT = timeFromIso(String(data.slot_end));
    setItems((prev) => [
      ...prev,
      {
        id: data.id,
        track_id: data.track_id,
        slot_start: timeFromIso(String(data.slot_start)),
        slot_end: endT,
        description: data.description,
        speakers: data.speakers,
        sort_order: data.sort_order,
      },
    ]);
    setNewDraft((prev) =>
      prev.track_id === data.track_id
        ? { ...prev, start: endT, end: addMinutes(endT, 30), desc: "", speakers: "" }
        : prev
    );
    router.refresh();
  }

  async function updateItem(it: Item) {
    setMsg(null);
    const res = await fetch(`/api/meetings/${meeting.id}/program-items/${it.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        track_id: it.track_id,
        slot_start: it.slot_start,
        slot_end: it.slot_end,
        description: it.description,
        speakers: it.speakers,
        sort_order: it.sort_order,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "Update mislukt");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function deleteItem(id: number) {
    if (!confirm("Item verwijderen?")) return;
    setMsg(null);
    const res = await fetch(`/api/meetings/${meeting.id}/program-items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg("Verwijderen mislukt");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) setEditingId(null);
    router.refresh();
  }

  async function moveItem(trackId: number, itemId: number, delta: -1 | 1) {
    const trackItems = sortTrackItems(items.filter((i) => i.track_id === trackId));
    const idx = trackItems.findIndex((i) => i.id === itemId);
    const j = idx + delta;
    if (idx < 0 || j < 0 || j >= trackItems.length) return;
    const a = trackItems[idx];
    const b = trackItems[j];
    const nextA = { ...a, sort_order: b.sort_order };
    const nextB = { ...b, sort_order: a.sort_order };
    setItems((prev) => prev.map((x) => (x.id === a.id ? nextA : x.id === b.id ? nextB : x)));
    setMsg(null);
    const [r1, r2] = await Promise.all([
      fetch(`/api/meetings/${meeting.id}/program-items/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: nextA.sort_order }),
      }),
      fetch(`/api/meetings/${meeting.id}/program-items/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: nextB.sort_order }),
      }),
    ]);
    if (!r1.ok || !r2.ok) {
      setItems((prev) => prev.map((x) => (x.id === a.id ? a : x.id === b.id ? b : x)));
      setMsg("Volgorde wijzigen mislukt");
      return;
    }
    router.refresh();
  }

  async function deleteMeeting() {
    if (meeting.is_template) {
      setMsg("De sjabloonmeetup kan niet worden verwijderd.");
      return;
    }
    if (!confirm("Hele meetup verwijderen?")) return;
    const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(typeof data.error === "string" ? data.error : "Verwijderen mislukt.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function addTrackRow(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !newTrackName.trim()) return;
    const res = await fetch(`/api/meetings/${meeting.id}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTrackName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Track aanmaken mislukt");
      return;
    }
    setTracks((prev) => sortTracksList([...prev, data]));
    setNewTrackName("");
    router.refresh();
  }

  async function updateTrack(t: Track) {
    setMsg(null);
    const res = await fetch(`/api/meetings/${meeting.id}/tracks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, sort_order: t.sort_order }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "Track bijwerken mislukt");
      return;
    }
    setEditingTrackId(null);
    router.refresh();
  }

  async function deleteTrack(id: number) {
    if (!confirm("Track verwijderen? Alle programma-items op deze track gaan ook verloren.")) return;
    setMsg(null);
    const res = await fetch(`/api/meetings/${meeting.id}/tracks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "Track verwijderen mislukt");
      return;
    }
    setTracks((prev) => prev.filter((x) => x.id !== id));
    setItems((prev) => prev.filter((x) => x.track_id !== id));
    if (trackFilterId === id) setTrackFilterId("all");
    if (newDraft.track_id === id) {
      const remaining = tracks.filter((x) => x.id !== id);
      const tid = remaining[0]?.id;
      if (tid != null) {
        setNewDraft((prev) => ({
          ...prev,
          track_id: tid,
          ...defaultDraftForTrack(tid, items.filter((i) => i.track_id !== id)),
        }));
      }
    }
    if (editingTrackId === id) setEditingTrackId(null);
    router.refresh();
  }

  async function moveTrack(trackId: number, delta: -1 | 1) {
    const ordered = sortTracksList(tracks);
    const idx = ordered.findIndex((t) => t.id === trackId);
    const j = idx + delta;
    if (idx < 0 || j < 0 || j >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[j];
    const nextA = { ...a, sort_order: b.sort_order };
    const nextB = { ...b, sort_order: a.sort_order };
    setTracks((prev) => sortTracksList(prev.map((x) => (x.id === a.id ? nextA : x.id === b.id ? nextB : x))));
    setMsg(null);
    const [r1, r2] = await Promise.all([
      fetch(`/api/meetings/${meeting.id}/tracks/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: nextA.sort_order }),
      }),
      fetch(`/api/meetings/${meeting.id}/tracks/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: nextB.sort_order }),
      }),
    ]);
    if (!r1.ok || !r2.ok) {
      setTracks((prev) => prev.map((x) => (x.id === a.id ? a : x.id === b.id ? b : x)));
      setMsg("Trackvolgorde wijzigen mislukt");
      return;
    }
    router.refresh();
  }

  function pickNewItemTrack(tid: number) {
    setNewDraft((prev) => ({ ...prev, track_id: tid, ...defaultDraftForTrack(tid, items) }));
  }

  const tracksSorted = sortTracksList(tracks);
  const showProgramTrackColumn = tracksSorted.length > 1;

  const [editorTab, setEditorTab] = useState<"meetup" | "programma" | "tracks">("meetup");

  const tabBtn = (id: "meetup" | "programma" | "tracks", label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={editorTab === id}
      id={`tab-${id}`}
      aria-controls={`panel-${id}`}
      className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        editorTab === id
          ? "border-teal-500 text-white"
          : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
      }`}
      onClick={() => setEditorTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-6 space-y-6">
      {meeting.is_template ? (
        <p className="rounded border border-amber-700/80 bg-amber-950/35 px-3 py-2 text-sm text-amber-100">
          Dit is de <strong>sjabloonmeetup</strong> (niet op de publieke site). Voor een echte meetup: ga naar{" "}
          <strong>Meetups</strong> en klik <strong>Standaardmeetup aanmaken</strong>.
        </p>
      ) : null}
      {msg && <p className="text-sm text-teal-300">{msg}</p>}

      <div className="flex flex-wrap gap-1 border-b border-slate-700" role="tablist" aria-label="Secties">
        {tabBtn("meetup", "Meetup")}
        {tabBtn("programma", "Programma")}
        {tabBtn("tracks", "Tracks")}
      </div>

      {editorTab === "meetup" && (
        <div
          className="space-y-8 pt-2"
          role="tabpanel"
          id="panel-meetup"
          aria-labelledby="tab-meetup"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <form
              onSubmit={saveMeta}
              className="min-w-0 flex-1 space-y-3 rounded border border-slate-700 p-4 lg:max-w-xl"
            >
              <h2 className="font-semibold text-white">Gegevens</h2>
              <div>
                <label>Meetup-datum</label>
                <input className="mt-1 w-full" value={meetup_date} onChange={(e) => setMeetup(e.target.value)} required />
              </div>
              <div>
                <label>Zichtbaar vanaf</label>
                <input className="mt-1 w-full" value={visible_from} onChange={(e) => setVis(e.target.value)} required />
              </div>
              <div>
                <label>Locatie</label>
                <input className="mt-1 w-full" value={venue_line} onChange={(e) => setVenue(e.target.value)} required />
              </div>
              <div>
                <label>Titel</label>
                <input className="mt-1 w-full" value={event_title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label>Postersjabloon</label>
                <select
                  className="mt-1 w-full"
                  value={poster_id}
                  onChange={(e) => setPosterId(Number(e.target.value))}
                  required
                  aria-label="Postersjabloon"
                >
                  {posters.length === 0 ? (
                    <option value={meeting.poster_id}>Geen sjablonen geladen</option>
                  ) : (
                    posters.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-xs text-slate-500">Lay-out en tekstvakken worden beheerd onder Posters in het menu.</p>
              </div>
              <button type="submit">Gegevens opslaan</button>
            </form>

            <div className="w-full shrink-0 space-y-3 lg:sticky lg:top-4 lg:w-[min(100%,20rem)]">
              <h2 className="text-sm font-semibold text-slate-300">Poster</h2>
              {meeting.poster_rel_path ? (
                <Image
                  key={posterPreviewKey}
                  src={`/${meeting.poster_rel_path}?v=${posterPreviewKey}`}
                  alt="Poster voor deze meetup"
                  width={937}
                  height={1678}
                  className="w-full rounded border border-slate-600"
                  unoptimized
                />
              ) : (
                <p className="text-sm text-slate-400">Nog geen posterbestand. Klik op Vernieuwen om te genereren.</p>
              )}
              <button type="button" disabled={posterRegenerating} onClick={() => void regeneratePosterJpeg()}>
                Vernieuwen
              </button>
            </div>
          </div>

          {isAdmin && !meeting.is_template && (
            <div className="border-t border-slate-700 pt-6">
              <button type="button" className="bg-red-900 hover:bg-red-800" onClick={() => void deleteMeeting()}>
                Meetup verwijderen
              </button>
            </div>
          )}
        </div>
      )}

      {editorTab === "programma" && (
        <div className="space-y-4 pt-2" role="tabpanel" id="panel-programma" aria-labelledby="tab-programma">
          <h2 className="font-semibold text-white">Programma</h2>
          <p className="text-sm text-slate-500">
            Tijden als HH:mm (24-uurs). Standaard gesorteerd op starttijd
            {showProgramTrackColumn
              ? ", daarna track. Klik op een kolomkop om te sorteren; in de track-kolom kun je filteren."
              : ". Klik op een kolomkop om te sorteren."}
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-[48rem]">
            <thead>
              <tr>
                <th className="w-[5.5rem] align-top">
                  <SortHeader label="Van" sortKey="slot_start" activeKey={sortKey} dir={sortDir} onSort={onProgramSort} />
                </th>
                <th className="w-[5.5rem] align-top">
                  <SortHeader label="Tot" sortKey="slot_end" activeKey={sortKey} dir={sortDir} onSort={onProgramSort} />
                </th>
                {showProgramTrackColumn ? (
                  <th className="min-w-[8rem] align-top">
                    <SortHeader label="Track" sortKey="track" activeKey={sortKey} dir={sortDir} onSort={onProgramSort}>
                      <select
                        className="w-full max-w-[11rem] py-1 text-xs"
                        value={trackFilterId === "all" ? "all" : String(trackFilterId)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTrackFilterId(v === "all" ? "all" : Number(v));
                        }}
                        aria-label="Filter op track"
                      >
                        <option value="all">Alle tracks</option>
                        {tracksSorted.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </SortHeader>
                  </th>
                ) : null}
                <th className="align-top">
                  <SortHeader label="Omschrijving" sortKey="description" activeKey={sortKey} dir={sortDir} onSort={onProgramSort} />
                </th>
                <th className="min-w-[8rem] align-top">
                  <SortHeader label="Spreker(s)" sortKey="speakers" activeKey={sortKey} dir={sortDir} onSort={onProgramSort} />
                </th>
                <th className="min-w-[13.5rem] whitespace-nowrap text-right align-top">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={showProgramTrackColumn ? 6 : 5} className="text-slate-500">
                    Geen programma-items{trackFilterId !== "all" ? " voor dit filter" : ""}.
                  </td>
                </tr>
              ) : (
                displayedItems.map((it) => {
                  const isEditing = editingId === it.id;
                  const busy = editingId !== null && editingId !== it.id;
                  const trackItems = sortTrackItems(items.filter((i) => i.track_id === it.track_id));
                  const pos = trackItems.findIndex((i) => i.id === it.id);
                  const trackName = showProgramTrackColumn
                    ? trackMap.get(it.track_id)?.name ?? `Track #${it.track_id}`
                    : "";
                  return (
                    <tr key={it.id} className={isEditing ? "bg-slate-800/60" : undefined}>
                      <td>
                        {isEditing ? (
                          <input
                            className="w-full min-w-[4.5rem] py-1.5"
                            value={it.slot_start}
                            onChange={(e) =>
                              setItems((p) => p.map((x) => (x.id === it.id ? { ...x, slot_start: e.target.value } : x)))
                            }
                          />
                        ) : (
                          <span className="tabular-nums text-slate-200">{it.slot_start}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="w-full min-w-[4.5rem] py-1.5"
                            value={it.slot_end}
                            onChange={(e) =>
                              setItems((p) => p.map((x) => (x.id === it.id ? { ...x, slot_end: e.target.value } : x)))
                            }
                          />
                        ) : (
                          <span className="tabular-nums text-slate-200">{it.slot_end}</span>
                        )}
                      </td>
                      {showProgramTrackColumn ? (
                        <td>
                          {isEditing ? (
                            <select
                              className="w-full max-w-[11rem] py-1.5"
                              value={it.track_id}
                              onChange={(e) =>
                                setItems((p) => p.map((x) => (x.id === it.id ? { ...x, track_id: Number(e.target.value) } : x)))
                              }
                            >
                              {tracksSorted.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-200">{trackName}</span>
                          )}
                        </td>
                      ) : null}
                      <td>
                        {isEditing ? (
                          <input
                            className="w-full py-1.5"
                            value={it.description}
                            onChange={(e) =>
                              setItems((p) => p.map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)))
                            }
                          />
                        ) : (
                          <span className="text-slate-200">{it.description}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="w-full py-1.5"
                            value={it.speakers ?? ""}
                            onChange={(e) =>
                              setItems((p) => p.map((x) => (x.id === it.id ? { ...x, speakers: e.target.value || null } : x)))
                            }
                          />
                        ) : (
                          <span className="text-slate-400">{it.speakers || "—"}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
                          {isEditing ? (
                            <IconAction label="Opslaan" onClick={() => updateItem(it)}>
                              <IconSave />
                            </IconAction>
                          ) : (
                            <IconAction label="Bewerken" disabled={busy} onClick={() => setEditingId(it.id)}>
                              <IconEdit />
                            </IconAction>
                          )}
                          <IconAction label="Verwijderen" disabled={busy && !isEditing} onClick={() => void deleteItem(it.id)}>
                            <IconDelete />
                          </IconAction>
                          <IconAction
                            label="Omhoog"
                            disabled={busy || pos <= 0}
                            onClick={() => void moveItem(it.track_id, it.id, -1)}
                          >
                            <IconUp />
                          </IconAction>
                          <IconAction
                            label="Omlaag"
                            disabled={busy || pos < 0 || pos >= trackItems.length - 1}
                            onClick={() => void moveItem(it.track_id, it.id, 1)}
                          >
                            <IconDown />
                          </IconAction>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={(e) => void addItem(e)} className="mt-6 space-y-3 rounded border border-dashed border-slate-600 p-4">
          <h3 className="text-sm font-medium text-slate-300">Nieuw programma-onderdeel</h3>
          <div
            className={`grid gap-3 sm:grid-cols-2 ${showProgramTrackColumn ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
          >
            <div>
              <label className="text-xs">Van</label>
              <input
                className="mt-1 w-full"
                value={newDraft.start}
                onChange={(e) => setNewDraft((p) => ({ ...p, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs">Tot</label>
              <input
                className="mt-1 w-full"
                value={newDraft.end}
                onChange={(e) => setNewDraft((p) => ({ ...p, end: e.target.value }))}
              />
            </div>
            {showProgramTrackColumn ? (
              <div>
                <label className="text-xs">Track</label>
                <select
                  className="mt-1 w-full"
                  value={newDraft.track_id}
                  onChange={(e) => pickNewItemTrack(Number(e.target.value))}
                >
                  {tracksSorted.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-xs">Omschrijving</label>
              <input
                className="mt-1 w-full"
                value={newDraft.desc}
                onChange={(e) => setNewDraft((p) => ({ ...p, desc: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-xs">Spreker(s)</label>
              <input
                className="mt-1 w-full"
                value={newDraft.speakers}
                onChange={(e) => setNewDraft((p) => ({ ...p, speakers: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit">Toevoegen</button>
        </form>
        </div>
      )}

      {editorTab === "tracks" && (
        <div className="pt-2" role="tabpanel" id="panel-tracks" aria-labelledby="tab-tracks">
          {isAdmin ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40">
              <h2 className="border-b border-slate-700 px-4 py-3 font-semibold text-white">Tracks</h2>
              <p className="px-4 pt-3 text-sm text-slate-500">
                Volgorde bepaalt o.a. de tweede sortering in het programma. Minimaal één track blijft bestaan.
              </p>
              <div className="overflow-x-auto p-4 pt-2">
                <table className="min-w-[28rem]">
              <thead>
                <tr>
                  <th>Tracknaam</th>
                  <th className="min-w-[13.5rem] whitespace-nowrap text-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                {tracksSorted.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-slate-500">
                      Geen tracks.
                    </td>
                  </tr>
                ) : (
                  tracksSorted.map((t, pos) => {
                    const isEditing = editingTrackId === t.id;
                    const busyT = editingTrackId !== null && editingTrackId !== t.id;
                    return (
                      <tr key={t.id} className={isEditing ? "bg-slate-800/60" : undefined}>
                        <td>
                          {isEditing ? (
                            <input
                              className="w-full max-w-md py-1.5"
                              value={t.name}
                              onChange={(e) =>
                                setTracks((p) => p.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))
                              }
                            />
                          ) : (
                            <span className="text-slate-200">{t.name}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
                            {isEditing ? (
                              <IconAction label="Opslaan" onClick={() => void updateTrack(t)}>
                                <IconSave />
                              </IconAction>
                            ) : (
                              <IconAction label="Bewerken" disabled={busyT} onClick={() => setEditingTrackId(t.id)}>
                                <IconEdit />
                              </IconAction>
                            )}
                            <IconAction label="Verwijderen" disabled={busyT && !isEditing} onClick={() => void deleteTrack(t.id)}>
                              <IconDelete />
                            </IconAction>
                            <IconAction label="Omhoog" disabled={busyT || pos === 0} onClick={() => void moveTrack(t.id, -1)}>
                              <IconUp />
                            </IconAction>
                            <IconAction
                              label="Omlaag"
                              disabled={busyT || pos >= tracksSorted.length - 1}
                              onClick={() => void moveTrack(t.id, 1)}
                            >
                              <IconDown />
                            </IconAction>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <form onSubmit={(e) => void addTrackRow(e)} className="space-y-2 border-t border-slate-700 p-4">
            <h3 className="text-sm font-medium text-slate-300">Nieuwe track</h3>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[12rem] flex-1"
                placeholder="Tracknaam"
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
              />
              <button type="submit">Toevoegen</button>
            </div>
          </form>
            </div>
          ) : (
            <p className="rounded border border-slate-700 bg-slate-900/30 p-4 text-slate-400">
              Alleen beheerders kunnen tracks beheren.
            </p>
          )}
        </div>
      )}

    </div>
  );
}
