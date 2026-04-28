"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PosterNormRect } from "@/lib/poster/poster-regions";
import { MIN_POSTER_RECT_H, MIN_POSTER_RECT_W } from "@/lib/poster/poster-regions";

type DragState = {
  kind: "move" | "resize";
  region: "title" | "program";
  startPointerNorm: { nx: number; ny: number };
  startRect: PosterNormRect;
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

type Props = {
  imageSrc: string;
  titleRegion: PosterNormRect;
  programRegion: PosterNormRect;
  editMode: boolean;
  onTitleChange: (r: PosterNormRect) => void;
  onProgramChange: (r: PosterNormRect) => void;
};

export function PosterRegionEditor({
  imageSrc,
  titleRegion,
  programRegion,
  editMode,
  onTitleChange,
  onProgramChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const normFromClient = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current?.querySelector("[data-poster-img]");
    if (!el) return { nx: 0, ny: 0 };
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return { nx: 0, ny: 0 };
    return { nx: (clientX - r.left) / r.width, ny: (clientY - r.top) / r.height };
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const cur = normFromClient(e.clientX, e.clientY);
      const dnx = cur.nx - drag.startPointerNorm.nx;
      const dny = cur.ny - drag.startPointerNorm.ny;
      const sr = drag.startRect;

      const applyMove = (setter: (r: PosterNormRect) => void) => {
        let x = clamp01(sr.x + dnx);
        let y = clamp01(sr.y + dny);
        x = Math.min(x, 1 - sr.w);
        y = Math.min(y, 1 - sr.h);
        setter({ ...sr, x, y });
      };

      const applyResize = (setter: (r: PosterNormRect) => void) => {
        let w = sr.w + dnx;
        let h = sr.h + dny;
        w = Math.max(MIN_POSTER_RECT_W, Math.min(w, 1 - sr.x));
        h = Math.max(MIN_POSTER_RECT_H, Math.min(h, 1 - sr.y));
        setter({ ...sr, w, h });
      };

      if (drag.region === "title") {
        if (drag.kind === "move") applyMove(onTitleChange);
        else applyResize(onTitleChange);
      } else {
        if (drag.kind === "move") applyMove(onProgramChange);
        else applyResize(onProgramChange);
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, normFromClient, onProgramChange, onTitleChange]);

  function startDrag(
    e: React.PointerEvent,
    region: "title" | "program",
    kind: "move" | "resize",
    rect: PosterNormRect
  ) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const startPointerNorm = normFromClient(e.clientX, e.clientY);
    setDrag({
      kind,
      region,
      startPointerNorm,
      startRect: { ...rect },
    });
  }

  const box = (region: "title" | "program", rect: PosterNormRect, label: string, borderClass: string) => (
    <div
      className="absolute box-border"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
      }}
    >
      <div
        className={`relative h-full w-full border-2 border-dashed ${borderClass} ${editMode ? "cursor-move bg-white/5" : ""}`}
        onPointerDown={editMode ? (e) => startDrag(e, region, "move", rect) : undefined}
        role="presentation"
      >
        <span className="pointer-events-none absolute left-1 top-0 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
          {label}
        </span>
        {editMode ? (
          <button
            type="button"
            aria-label="Formaat wijzigen"
            className="absolute bottom-0 right-0 z-10 h-4 w-4 cursor-se-resize border border-slate-200 bg-teal-500"
            onPointerDown={(e) => {
              e.stopPropagation();
              startDrag(e, region, "resize", rect);
            }}
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} className="relative inline-block max-w-full select-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- need native sizing for normalized regions */}
      <img data-poster-img src={imageSrc} alt="Poster template" className="block max-h-[85vh] w-auto rounded border border-slate-600" draggable={false} />
      {editMode ? (
        <>
          {box("title", titleRegion, "Titel + datum", "border-amber-400")}
          {box("program", programRegion, "Programma + locatie", "border-teal-400")}
        </>
      ) : null}
    </div>
  );
}
