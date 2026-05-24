import { dTagFromEventTags, eventToDisplayJson, formatEventCreatedAt } from "@/lib/nostr/fetch-author-events";
import { NostrDeleteAllButton } from "@/components/NostrDeleteAllButton";
import { NostrEventDeleteButton } from "@/components/NostrEventDeleteButton";
import type { Event } from "nostr-tools/core";

export function NostrEventsTable({ events, canDelete }: { events: Event[]; canDelete: boolean }) {
  const deletableCount = events.filter((ev) => ev.kind !== 5).length;

  return (
    <>
      {canDelete ? <NostrDeleteAllButton eventCount={deletableCount} /> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem]">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th className="w-20">Kind</th>
            <th className="w-44 whitespace-nowrap">Aangemaakt</th>
            {canDelete ? <th className="w-28">Acties</th> : null}
            <th>Event JSON</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => (
            <tr key={ev.id}>
              <td className="align-top tabular-nums text-slate-400">{i + 1}</td>
              <td className="align-top tabular-nums">{ev.kind}</td>
              <td className="align-top whitespace-nowrap text-sm">{formatEventCreatedAt(ev.created_at)}</td>
              {canDelete ? (
                <td className="align-top">
                  <NostrEventDeleteButton eventId={ev.id} kind={ev.kind} dTag={dTagFromEventTags(ev.tags)} />
                </td>
              ) : null}
              <td className="align-top">
                <pre className="max-h-96 overflow-auto rounded border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
                  {eventToDisplayJson(ev)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}
