"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dTagFromEventTags,
  eventSummaryLabel,
  eventToDisplayJson,
  type SerializableNostrEvent,
} from "@/lib/nostr/fetch-author-events";
import { NostrDeleteAllButton } from "@/components/NostrDeleteAllButton";
import { NostrEventDeleteButton } from "@/components/NostrEventDeleteButton";
import { APP_NOSTR_KIND_FILTERS, isAppNostrKind, NOSTR_KIND } from "@/lib/nostr/event-builder";

type Props = {
  events: SerializableNostrEvent[];
  canDelete: boolean;
};

type DetailTab = "preview" | "raw";

function isCalendarEventKind(kind: number): boolean {
  return kind === NOSTR_KIND.TIME_BASED_CALENDAR_EVENT || kind === NOSTR_KIND.CALENDAR;
}

function isProfileKind(kind: number): boolean {
  return kind === NOSTR_KIND.METADATA;
}

function isDeletionKind(kind: number): boolean {
  return kind === NOSTR_KIND.DELETION;
}

function hasPreviewTabs(kind: number): boolean {
  return isCalendarEventKind(kind) || isProfileKind(kind) || isDeletionKind(kind);
}

type NostrProfileContent = {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  website?: string;
  lud16?: string;
  banner?: string;
};

function parseProfileContent(content: string): NostrProfileContent | null {
  try {
    return JSON.parse(content) as NostrProfileContent;
  } catch {
    return null;
  }
}

function defaultKindFilter(): Record<number, boolean> {
  return Object.fromEntries(APP_NOSTR_KIND_FILTERS.map((f) => [f.kind, f.defaultEnabled]));
}

function kindFilterOptions(events: SerializableNostrEvent[]) {
  const knownLabels = Object.fromEntries(APP_NOSTR_KIND_FILTERS.map((f) => [f.kind, f.label]));
  const knownDefaults = Object.fromEntries(APP_NOSTR_KIND_FILTERS.map((f) => [f.kind, f.defaultEnabled]));
  const kinds = [...new Set(events.map((ev) => ev.kind))].sort((a, b) => a - b);
  return kinds.map((kind) => ({
    kind,
    label: knownLabels[kind] ?? `Kind ${kind}`,
    defaultEnabled: knownDefaults[kind] ?? true,
  }));
}

function tagValue(tags: string[][], name: string): string | null {
  const row = tags.find((t) => t[0] === name && t[1]);
  return row?.[1] ?? null;
}

function tagValues(tags: string[][], name: string): string[] {
  return tags.filter((t) => t[0] === name && t[1]).map((t) => t[1]!);
}

function formatUnixLabel(unix: string | null, timeZone: string): string | null {
  if (!unix) return null;
  const n = Number(unix);
  if (!Number.isFinite(n)) return null;
  return new Date(n * 1000).toLocaleString("nl-NL", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CalendarEventPreview({ event }: { event: SerializableNostrEvent }) {
  const title = tagValue(event.tags, "title");
  const timeZone = tagValue(event.tags, "start_tzid") ?? tagValue(event.tags, "end_tzid") ?? "UTC";
  const startLabel = formatUnixLabel(tagValue(event.tags, "start"), timeZone);
  const endLabel = formatUnixLabel(tagValue(event.tags, "end"), timeZone);
  const location = tagValue(event.tags, "location");
  const summary = tagValue(event.tags, "summary");
  const image = tagValue(event.tags, "image");
  const hashtags = tagValues(event.tags, "t");
  const dTag = dTagFromEventTags(event.tags);
  const refs = event.tags.filter((t) => t[0] === "a" && t[1]);

  return (
    <div className="space-y-4 text-sm">
      {title ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Titel</p>
          <p className="mt-1 text-base font-medium text-white">{title}</p>
        </div>
      ) : null}

      {dTag ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">d-tag</p>
          <p className="mt-1 font-mono text-slate-200">{dTag}</p>
        </div>
      ) : null}

      {event.kind === NOSTR_KIND.TIME_BASED_CALENDAR_EVENT && (startLabel || endLabel) ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Tijd</p>
          <p className="mt-1 text-slate-200">
            {startLabel ?? "—"}
            {endLabel ? ` → ${endLabel}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{timeZone}</p>
        </div>
      ) : null}

      {location ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Locatie</p>
          <p className="mt-1 text-slate-200">{location}</p>
        </div>
      ) : null}

      {summary ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Samenvatting</p>
          <p className="mt-1 text-slate-200">{summary}</p>
        </div>
      ) : null}

      {image ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Afbeelding</p>
          <a href={image} target="_blank" rel="noreferrer" className="mt-1 block break-all">
            {image}
          </a>
        </div>
      ) : null}

      {hashtags.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Hashtags</p>
          <p className="mt-1 text-slate-200">{hashtags.map((t) => `#${t}`).join(" ")}</p>
        </div>
      ) : null}

      {event.kind === NOSTR_KIND.CALENDAR && refs.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Meetup-referenties</p>
          <ul className="mt-1 space-y-1 font-mono text-xs text-slate-300">
            {refs.map((t) => (
              <li key={t[1]} className="break-all">
                {t[1]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {event.content ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Beschrijving</p>
          <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950/60 p-3 text-slate-300">
            {event.content}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ProfilePreview({ event }: { event: SerializableNostrEvent }) {
  const profile = parseProfileContent(event.content);
  if (!profile) {
    return (
      <p className="text-sm text-amber-200">
        Profiel-JSON kon niet worden gelezen. Gebruik het tabblad Raw voor de ruwe inhoud.
      </p>
    );
  }

  const fields: { label: string; value: string }[] = [
    { label: "Naam", value: profile.name ?? "" },
    { label: "Weergavenaam", value: profile.display_name ?? "" },
    { label: "Over", value: profile.about ?? "" },
    { label: "NIP-05", value: profile.nip05 ?? "" },
    { label: "Website", value: profile.website ?? "" },
    { label: "Lightning", value: profile.lud16 ?? "" },
  ].filter((f) => f.value);

  return (
    <div className="space-y-4 text-sm">
      {profile.picture ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Profielafbeelding</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.picture}
            alt={profile.display_name ?? profile.name ?? "Profielafbeelding"}
            className="mt-2 max-h-48 rounded border border-slate-700 object-contain"
          />
          <a href={profile.picture} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs">
            {profile.picture}
          </a>
        </div>
      ) : null}

      {profile.banner ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Banner</p>
          <a href={profile.banner} target="_blank" rel="noreferrer" className="mt-1 block break-all">
            {profile.banner}
          </a>
        </div>
      ) : null}

      {fields.length > 0 ? (
        <dl className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          {fields.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="break-words text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-slate-500">Geen profielvelden in dit event.</p>
      )}
    </div>
  );
}

function DeletionPreview({ event }: { event: SerializableNostrEvent }) {
  const targets = event.tags.filter((t) => t[0] === "e" && t[1]);

  return (
    <div className="space-y-4 text-sm">
      {event.content ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Reden</p>
          <p className="mt-1 text-slate-200">{event.content}</p>
        </div>
      ) : null}

      {targets.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Verwijderde events</p>
          <ul className="mt-1 space-y-1 font-mono text-xs text-slate-300">
            {targets.map((t) => (
              <li key={t[1]} className="break-all">
                {t[1]}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-slate-500">Geen event-referenties in dit verwijderverzoek.</p>
      )}
    </div>
  );
}

function EventContentPreview({ event }: { event: SerializableNostrEvent }) {
  if (isProfileKind(event.kind)) {
    return <ProfilePreview event={event} />;
  }

  if (isDeletionKind(event.kind)) {
    return <DeletionPreview event={event} />;
  }

  return null;
}

function DetailTabBar({
  active,
  onChange,
}: {
  active: DetailTab;
  onChange: (tab: DetailTab) => void;
}) {
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "preview", label: "Preview" },
    { id: "raw", label: "Raw" },
  ];

  return (
    <div className="flex shrink-0 gap-1 border-b border-slate-700 px-4">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`-mb-px rounded-none border-b-2 bg-transparent px-3 py-2 text-sm font-medium shadow-none ${
            active === id
              ? "border-teal-500 text-teal-300"
              : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EventDetailBody({ event, tab }: { event: SerializableNostrEvent; tab: DetailTab }) {
  if (hasPreviewTabs(event.kind)) {
    if (tab === "preview") {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isCalendarEventKind(event.kind) ? (
            <CalendarEventPreview event={event} />
          ) : (
            <EventContentPreview event={event} />
          )}
        </div>
      );
    }
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <pre className="overflow-x-auto rounded border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
          {eventToDisplayJson(event)}
        </pre>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Raw JSON</p>
      <pre className="overflow-x-auto rounded border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
        {eventToDisplayJson(event)}
      </pre>
    </div>
  );
}

export function NostrEventsViewer({ events, canDelete }: Props) {
  const filterOptions = useMemo(() => kindFilterOptions(events), [events]);
  const [kindFilter, setKindFilter] = useState<Record<number, boolean>>(defaultKindFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("preview");

  useEffect(() => {
    setKindFilter((prev) => {
      const next = { ...prev };
      for (const { kind, defaultEnabled } of filterOptions) {
        if (!(kind in next)) next[kind] = defaultEnabled;
      }
      return next;
    });
  }, [filterOptions]);

  const filteredEvents = useMemo(
    () => events.filter((ev) => kindFilter[ev.kind] !== false),
    [events, kindFilter],
  );

  const kindCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const ev of events) {
      counts[ev.kind] = (counts[ev.kind] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const selected = useMemo(
    () => filteredEvents.find((ev) => ev.id === selectedId) ?? filteredEvents[0] ?? null,
    [filteredEvents, selectedId],
  );

  useEffect(() => {
    if (filteredEvents.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredEvents.some((ev) => ev.id === selectedId)) {
      setSelectedId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedId]);

  useEffect(() => {
    setCopied(false);
    setDetailTab("preview");
  }, [selected?.id]);

  async function copyJson() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(eventToDisplayJson(selected));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (events.length === 0) {
    return null;
  }

  const deletableAppEvents = events.filter((ev) => isAppNostrKind(ev.kind) && ev.kind !== NOSTR_KIND.DELETION);

  function toggleKind(kind: number, enabled: boolean) {
    setKindFilter((prev) => ({ ...prev, [kind]: enabled }));
  }

  return (
    <div className="mt-6">
      {canDelete ? <NostrDeleteAllButton eventCount={deletableAppEvents.length} /> : null}

      <fieldset className="mt-4 rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-3">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">Filter op type</legend>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
          {filterOptions.map(({ kind, label }) => (
            <label key={kind} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                checked={kindFilter[kind] !== false}
                onChange={(e) => toggleKind(kind, e.target.checked)}
              />
              <span>
                {label}{" "}
                <span className="text-slate-500">({kindCounts[kind] ?? 0})</span>
                <span className="ml-1 text-xs text-slate-600">kind {kind}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid h-[min(70vh,48rem)] gap-4 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
        <aside className="flex min-h-[16rem] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950/60 lg:min-h-0">
          <div className="shrink-0 border-b border-slate-700 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Events ({filteredEvents.length}
            {filteredEvents.length !== events.length ? ` / ${events.length}` : ""})
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <li className="px-3 py-6 text-sm text-slate-500">Geen events voor dit filter.</li>
            ) : (
              filteredEvents.map((ev) => {
                const active = selected?.id === ev.id;
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(ev.id)}
                      className={`w-full rounded-none border-b border-slate-800 px-3 py-2.5 text-left font-normal shadow-none transition-colors ${
                        active
                          ? "border-l-2 border-l-teal-500 bg-slate-800/80 text-white hover:bg-slate-800/80"
                          : "border-l-2 border-l-transparent bg-transparent text-slate-100 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="truncate text-sm font-medium">{eventSummaryLabel(ev)}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                        <span className="tabular-nums">kind {ev.kind}</span>
                        <span>{ev.createdAtLabel}</span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[10px] text-slate-500">{ev.id.slice(0, 16)}…</div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="flex min-h-[20rem] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950/40 lg:min-h-0">
          {selected ? (
            <>
              <header className="shrink-0 border-b border-slate-700 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-white">{eventSummaryLabel(selected)}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {selected.createdAtLabel} · kind {selected.kind}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">{selected.id}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <button
                      type="button"
                      className="bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
                      onClick={() => void copyJson()}
                    >
                      {copied ? "Gekopieerd" : "Kopieer JSON"}
                    </button>
                    {canDelete && isAppNostrKind(selected.kind) && selected.kind !== NOSTR_KIND.DELETION ? (
                      <NostrEventDeleteButton
                        eventId={selected.id}
                        kind={selected.kind}
                        dTag={dTagFromEventTags(selected.tags)}
                      />
                    ) : null}
                  </div>
                </div>
              </header>
              {hasPreviewTabs(selected.kind) ? (
                <DetailTabBar active={detailTab} onChange={setDetailTab} />
              ) : null}
              <EventDetailBody event={selected} tab={detailTab} />
            </>
          ) : (
            <p className="p-6 text-slate-500">Selecteer een event in de lijst.</p>
          )}
        </section>
      </div>
    </div>
  );
}
