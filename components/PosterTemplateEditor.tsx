"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PosterRegionEditor } from "@/components/PosterRegionEditor";
import {
  TEMPLATE_EDITOR_DUMMY_MEETING_ID,
  templateEditorPreviewRelPath,
} from "@/lib/poster/dummy-template-preview-constants";
import {
  DEFAULT_POSTER_PROGRAM_REGION,
  DEFAULT_POSTER_TITLE_REGION,
  parseStoredPosterRegions,
  type PosterRegions,
} from "@/lib/poster/poster-regions";

export type PosterEditorModel = {
  id: number;
  name: string;
  slug: string;
  template_rel_path: string;
  title_region?: unknown;
  program_region?: unknown;
};

export type PosterMeetingChoice = { id: number; label: string };

type Props = {
  poster: PosterEditorModel;
  meetingChoices: PosterMeetingChoice[];
};

export function PosterTemplateEditor({ poster, meetingChoices }: Props) {
  const router = useRouter();
  const [regions, setRegions] = useState<PosterRegions>(() =>
    parseStoredPosterRegions(poster.title_region, poster.program_region)
  );
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number>(() => meetingChoices[0]?.id ?? TEMPLATE_EDITOR_DUMMY_MEETING_ID);

  useEffect(() => {
    setRegions(parseStoredPosterRegions(poster.title_region, poster.program_region));
  }, [poster.title_region, poster.program_region]);

  useEffect(() => {
    if (meetingChoices.length === 0) return;
    const ids = new Set(meetingChoices.map((c) => c.id));
    if (!ids.has(selectedMeetingId)) {
      setSelectedMeetingId(meetingChoices[0].id);
    }
  }, [meetingChoices, selectedMeetingId]);

  const setTitleRegion = useCallback((r: PosterRegions["title"]) => {
    setRegions((p) => ({ ...p, title: r }));
  }, []);
  const setProgramRegion = useCallback((r: PosterRegions["program"]) => {
    setRegions((p) => ({ ...p, program: r }));
  }, []);

  const templateSrc = poster.template_rel_path.startsWith("/")
    ? poster.template_rel_path
    : `/${poster.template_rel_path}`;

  const refreshPreview = useCallback(
    async (meetingId: number) => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/posters/${poster.id}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg(data.error ?? "Voorbeeld genereren mislukt");
          return;
        }
        setPreviewKey((k) => k + 1);
      } finally {
        setPreviewLoading(false);
      }
    },
    [poster.id]
  );

  useEffect(() => {
    void refreshPreview(selectedMeetingId);
  }, [poster.id, selectedMeetingId, refreshPreview]);

  async function saveRegions() {
    setMsg(null);
    const res = await fetch(`/api/posters/${poster.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title_region: regions.title,
        program_region: regions.program,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Opslaan mislukt");
      return;
    }
    setLayoutEditing(false);
    router.refresh();
    setMsg("Opgeslagen; alle meetups met dit sjabloon zijn vernieuwd.");
    await refreshPreview(selectedMeetingId);
  }

  function cancelEdit() {
    setRegions(parseStoredPosterRegions(poster.title_region, poster.program_region));
    setLayoutEditing(false);
    setMsg(null);
  }

  async function regenerateAll() {
    setMsg(null);
    setRegenerating(true);
    try {
      const res = await fetch(`/api/posters/${poster.id}/regenerate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Vernieuwen mislukt");
        return;
      }
      router.refresh();
      setMsg("Alle posters voor dit sjabloon zijn opnieuw gegenereerd.");
      await refreshPreview(selectedMeetingId);
    } finally {
      setRegenerating(false);
    }
  }

  const previewPath = templateEditorPreviewRelPath(poster.id);

  return (
    <div className="space-y-4">
      {msg ? <p className="text-sm text-teal-300">{msg}</p> : null}
      <p className="text-sm text-slate-400">
        <span className="text-slate-200">{poster.name}</span> ({poster.slug})
      </p>

      {layoutEditing ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void saveRegions()}>
              Opslaan
            </button>
            <button type="button" className="border border-slate-600 bg-slate-800 hover:bg-slate-700" onClick={cancelEdit}>
              Annuleren
            </button>
            <button
              type="button"
              className="border border-slate-600 bg-slate-800 hover:bg-slate-700"
              onClick={() =>
                setRegions({
                  title: { ...DEFAULT_POSTER_TITLE_REGION },
                  program: { ...DEFAULT_POSTER_PROGRAM_REGION },
                })
              }
            >
              Standaardgebieden
            </button>
          </div>
          <PosterRegionEditor
            imageSrc={templateSrc}
            titleRegion={regions.title}
            programRegion={regions.program}
            editMode
            onTitleChange={setTitleRegion}
            onProgramChange={setProgramRegion}
          />
        </>
      ) : (
        <>
          <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <div className="min-w-0 flex-1">
              <label htmlFor="poster-preview-meetup" className="text-sm text-slate-400">
                Voorbeeld meetup
              </label>
              <select
                id="poster-preview-meetup"
                className="mt-1 w-full"
                value={selectedMeetingId}
                disabled={previewLoading}
                onChange={(e) => setSelectedMeetingId(Number(e.target.value))}
              >
                {meetingChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 pb-0.5">
              <button type="button" onClick={() => setLayoutEditing(true)}>
                Bewerken
              </button>
              <button type="button" disabled={regenerating} onClick={() => void regenerateAll()}>
                Vernieuwen
              </button>
            </div>
          </div>
          <Image
            key={previewKey}
            src={`/${previewPath}?v=${previewKey}`}
            alt="Poster voorbeeld met gekozen meetup en huidig sjabloon"
            width={937}
            height={1678}
            className="max-h-[85vh] w-auto rounded border border-slate-600"
            unoptimized
          />
          <p className="text-xs text-slate-500">
            Voorbeeld: huidige tekstvakken van dit sjabloon met gegevens van de gekozen meetup
            {selectedMeetingId === TEMPLATE_EDITOR_DUMMY_MEETING_ID ? " (dummy)" : ""}. Bestand: {previewPath}
          </p>
        </>
      )}
    </div>
  );
}
