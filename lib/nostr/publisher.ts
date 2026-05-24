import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import type { Meeting } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { amsterdamTodayYmd, isMeetingPublicVisible, toAmsterdamYmd } from "@/lib/dates";
import { loadServerKey } from "@/lib/nostr/keys";
import { getRelays } from "@/lib/nostr/relays";
import {
  buildCalendarCollection,
  buildDeletionRequest,
  buildProfileEvent,
  buildTimeBasedCalendarEvent,
  NOSTR_KIND,
  type UnsignedNostrEvent,
} from "@/lib/nostr/event-builder";
import {
  getNostrCalendarCollectionDescription,
  getNostrDeletionReason,
  getNostrProfileAbout,
  getNostrProfileDisplayName,
  getNostrProfileName,
  getNostrProfilePictureUrl,
} from "@/lib/nostr/config";
import {
  calendarCollectionDTag,
  calendarCollectionTitle,
  meetingDTag,
  meetingToCalendarEventInput,
} from "@/lib/nostr/meeting-to-event";
import { dTagFromEventTags, fetchAuthorEventsFromRelays } from "@/lib/nostr/fetch-author-events";
import { getNip05Identifier } from "@/lib/nostr/nip05";

const PUBLISH_TIMEOUT_MS = 8000;

function collectionRelayHint(): string {
  const relays = getRelays();
  const first = relays[0];
  if (!first) {
    throw new Error("NOSTR_RELAYS must contain at least one relay");
  }
  return first;
}

export type PublishResult = {
  id: string;
  acceptedRelays: string[];
  failedRelays: string[];
};

function toEventTemplate(unsigned: UnsignedNostrEvent): EventTemplate {
  return {
    kind: unsigned.kind,
    created_at: unsigned.created_at,
    tags: unsigned.tags,
    content: unsigned.content,
  };
}

async function publishUnsigned(unsigned: UnsignedNostrEvent): Promise<PublishResult> {
  const { skBytes } = loadServerKey();
  const relays = getRelays();
  const signed = finalizeEvent(toEventTemplate(unsigned), skBytes);
  const pool = new SimplePool();

  const acceptedRelays: string[] = [];
  const failedRelays: string[] = [];

  try {
    await Promise.all(
      relays.map(async (relay) => {
        try {
          // pool.publish returns one promise per relay; each must be awaited or rejections go unhandled.
          await Promise.race([
            Promise.all(pool.publish([relay], signed)),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), PUBLISH_TIMEOUT_MS),
            ),
          ]);
          acceptedRelays.push(relay);
        } catch {
          failedRelays.push(relay);
        }
      }),
    );
  } finally {
    pool.close(relays);
  }

  if (acceptedRelays.length === 0) {
    throw new Error(`Publish failed on all relays (${failedRelays.length})`);
  }

  return { id: signed.id, acceptedRelays, failedRelays };
}

async function loadMeetingBundle(meetingId: number) {
  return prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      tracks: { orderBy: { sort_order: "asc" } },
      items: {
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        include: { track: true },
      },
    },
  });
}

function assertMeetingPublishable(meeting: Meeting): void {
  if (meeting.is_template) {
    throw new Error("Sjabloonmeetups worden niet op Nostr gepubliceerd.");
  }
  const today = amsterdamTodayYmd();
  if (!isMeetingPublicVisible(meeting.visible_from, today)) {
    throw new Error(`Nog niet publiek zichtbaar (vanaf ${toAmsterdamYmd(meeting.visible_from)}).`);
  }
}

async function publishCalendarCollection(pkHex: string): Promise<PublishResult | null> {
  const today = amsterdamTodayYmd();
  const rows = await prisma.meeting.findMany({
    where: {
      is_template: false,
      nostr_event_id: { not: null },
      nostr_d_tag: { not: null },
    },
    orderBy: { meetup_date: "asc" },
  });
  const upcoming = rows.filter((m) => toAmsterdamYmd(m.meetup_date) >= today);
  if (upcoming.length === 0) return null;

  const unsigned = buildCalendarCollection({
    identifier: calendarCollectionDTag(),
    title: calendarCollectionTitle(),
    description: getNostrCalendarCollectionDescription(),
    authorPubkey: pkHex,
    eventRefs: upcoming.map((m) => ({
      dTag: m.nostr_d_tag!,
      relayHint: collectionRelayHint(),
    })),
  });
  return publishUnsigned(unsigned);
}

export async function publishProfile(): Promise<PublishResult> {
  const { pkHex } = loadServerKey();
  const unsigned = buildProfileEvent({
    name: getNostrProfileName(),
    displayName: getNostrProfileDisplayName(),
    about: getNostrProfileAbout(),
    picture: getNostrProfilePictureUrl(),
    nip05: getNip05Identifier(),
  });
  const result = await publishUnsigned(unsigned);
  void pkHex;
  return result;
}

export async function publishMeeting(
  meetingId: number,
  opts?: { skipCalendarCollection?: boolean },
): Promise<PublishResult> {
  const meeting = await loadMeetingBundle(meetingId);
  if (!meeting) throw new Error("Meetup niet gevonden.");
  assertMeetingPublishable(meeting);

  const { pkHex } = loadServerKey();
  const dTag = meetingDTag(meeting.meetup_date);
  const input = meetingToCalendarEventInput(meeting, meeting.items, meeting.tracks);
  const unsigned = buildTimeBasedCalendarEvent(input);
  const result = await publishUnsigned(unsigned);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      nostr_event_id: result.id,
      nostr_d_tag: dTag,
      nostr_published_at: new Date(),
      nostr_last_error: null,
    },
  });

  if (!opts?.skipCalendarCollection) {
    try {
      await publishCalendarCollection(pkHex);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Collection publish failed";
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { nostr_last_error: `Event OK; collection: ${msg}`.slice(0, 1024) },
      });
    }
  }

  return result;
}

export async function isMeetingDirtyForNostr(meetingId: number): Promise<boolean> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      nostr_event_id: true,
      nostr_published_at: true,
      updated_at: true,
      items: { select: { updated_at: true } },
    },
  });
  if (!meeting?.nostr_event_id || !meeting.nostr_published_at) return false;
  const publishedAt = meeting.nostr_published_at.getTime();
  if (meeting.updated_at.getTime() > publishedAt) return true;
  return meeting.items.some((it) => it.updated_at.getTime() > publishedAt);
}

export async function republishIfDirty(meetingId: number): Promise<PublishResult | null> {
  const dirty = await isMeetingDirtyForNostr(meetingId);
  if (!dirty) return null;
  try {
    return await publishMeeting(meetingId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nostr republish failed";
    await prisma.meeting
      .update({
        where: { id: meetingId },
        data: { nostr_last_error: msg.slice(0, 1024) },
      })
      .catch(() => undefined);
    return null;
  }
}

export async function requestEventDeletion(opts: {
  eventId: string;
  kind: number;
  dTag?: string | null;
  /** Republish calendar collection after deleting a meetup event. Default true. */
  updateCollection?: boolean;
}): Promise<PublishResult> {
  const { pkHex } = loadServerKey();
  const unsigned = buildDeletionRequest({
    eventId: opts.eventId,
    kind: opts.kind,
    pubkey: pkHex,
    dTag: opts.dTag,
    reason: getNostrDeletionReason(),
  });
  const result = await publishUnsigned(unsigned);

  const meeting = await prisma.meeting.findFirst({
    where: { nostr_event_id: opts.eventId },
    select: { id: true },
  });
  if (meeting) {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        nostr_event_id: null,
        nostr_d_tag: null,
        nostr_published_at: null,
        nostr_last_error: null,
      },
    });
    if (opts.updateCollection !== false) {
      try {
        await publishCalendarCollection(pkHex);
      } catch {
        /* best-effort */
      }
    }
  }

  return result;
}

export async function requestAllEventsDeletion(): Promise<{
  attempted: number;
  succeeded: number;
  failed: { eventId: string; kind: number; error: string }[];
}> {
  const fetched = await fetchAuthorEventsFromRelays();
  if (!fetched.ok) {
    throw new Error(fetched.error);
  }

  const targets = fetched.events.filter((ev) => ev.kind !== NOSTR_KIND.DELETION);
  const failed: { eventId: string; kind: number; error: string }[] = [];
  let succeeded = 0;

  for (const ev of targets) {
    try {
      await requestEventDeletion({
        eventId: ev.id,
        kind: ev.kind,
        dTag: dTagFromEventTags(ev.tags),
        updateCollection: false,
      });
      succeeded++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      failed.push({ eventId: ev.id, kind: ev.kind, error: msg });
    }
  }

  await prisma.meeting.updateMany({
    where: { nostr_event_id: { not: null } },
    data: {
      nostr_event_id: null,
      nostr_d_tag: null,
      nostr_published_at: null,
      nostr_last_error: null,
    },
  });

  return { attempted: targets.length, succeeded, failed };
}

export async function deleteMeetingFromNostr(meetingId: number): Promise<void> {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting?.nostr_event_id || !meeting.nostr_d_tag) return;

  const { pkHex } = loadServerKey();
  const unsigned = buildDeletionRequest({
    eventId: meeting.nostr_event_id,
    kind: NOSTR_KIND.TIME_BASED_CALENDAR_EVENT,
    pubkey: pkHex,
    dTag: meeting.nostr_d_tag,
    reason: getNostrDeletionReason(),
  });

  try {
    await publishUnsigned(unsigned);
  } catch {
    /* best-effort */
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      nostr_event_id: null,
      nostr_d_tag: null,
      nostr_published_at: null,
    },
  });

  try {
    await publishCalendarCollection(pkHex);
  } catch {
    /* best-effort */
  }
}

export async function findMeetingsDueForPublish(): Promise<number[]> {
  return findMeetingsForNostrPublish({ includePast: false, unpublishedOnly: false });
}

export type NostrPublishQueryOptions = {
  /** Include meetups before today (Amsterdam). Default false. */
  includePast?: boolean;
  /** When false, also republish meetings changed since last Nostr publish. Default true for backfill. */
  unpublishedOnly?: boolean;
};

export async function findMeetingsForNostrPublish(
  opts: NostrPublishQueryOptions = {},
): Promise<number[]> {
  const includePast = opts.includePast ?? false;
  const unpublishedOnly = opts.unpublishedOnly ?? true;
  const today = amsterdamTodayYmd();
  const rows = await prisma.meeting.findMany({
    where: { is_template: false },
    select: {
      id: true,
      meetup_date: true,
      visible_from: true,
      nostr_event_id: true,
      nostr_published_at: true,
      updated_at: true,
      items: { select: { updated_at: true } },
    },
    orderBy: { meetup_date: "asc" },
  });

  const due: number[] = [];
  for (const m of rows) {
    if (!includePast && toAmsterdamYmd(m.meetup_date) < today) continue;
    if (!isMeetingPublicVisible(m.visible_from, today)) continue;

    if (!m.nostr_event_id || !m.nostr_published_at) {
      due.push(m.id);
      continue;
    }
    if (unpublishedOnly) continue;

    const publishedAt = m.nostr_published_at.getTime();
    if (m.updated_at.getTime() > publishedAt) {
      due.push(m.id);
      continue;
    }
    if (m.items.some((it) => it.updated_at.getTime() > publishedAt)) {
      due.push(m.id);
    }
  }
  return due;
}

async function publishMeetingIds(
  ids: number[],
  opts?: { deferCalendarCollection?: boolean },
): Promise<{
  attempted: number[];
  succeeded: number[];
  failed: { id: number; error: string }[];
}> {
  const succeeded: number[] = [];
  const failed: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      await publishMeeting(id, { skipCalendarCollection: opts?.deferCalendarCollection });
      succeeded.push(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "publish failed";
      failed.push({ id, error: msg });
      await prisma.meeting
        .update({
          where: { id },
          data: { nostr_last_error: msg.slice(0, 1024) },
        })
        .catch(() => undefined);
    }
  }

  if (opts?.deferCalendarCollection && succeeded.length > 0) {
    try {
      const { pkHex } = loadServerKey();
      await publishCalendarCollection(pkHex);
    } catch {
      /* collection best-effort after batch */
    }
  }

  return { attempted: ids, succeeded, failed };
}

export type BackfillSummary = {
  attempted: number[];
  succeeded: number[];
  failed: { id: number; error: string }[];
  includePast: boolean;
  skipped: {
    alreadyPublished: number[];
    notYetVisible: number[];
    pastMeetups: number[];
  };
  hint: string | null;
};

export async function summarizeBackfillStatus(includePast: boolean): Promise<Omit<BackfillSummary, "attempted" | "succeeded" | "failed">> {
  const today = amsterdamTodayYmd();
  const rows = await prisma.meeting.findMany({
    where: { is_template: false },
    select: {
      id: true,
      meetup_date: true,
      visible_from: true,
      nostr_event_id: true,
      nostr_published_at: true,
    },
    orderBy: { meetup_date: "asc" },
  });

  const alreadyPublished: number[] = [];
  const notYetVisible: number[] = [];
  const pastMeetups: number[] = [];

  for (const m of rows) {
    const meetYmd = toAmsterdamYmd(m.meetup_date);
    const isPast = meetYmd < today;
    const isPublic = isMeetingPublicVisible(m.visible_from, today);
    const needs = !m.nostr_event_id || !m.nostr_published_at;

    if (!needs) {
      alreadyPublished.push(m.id);
      continue;
    }
    if (!isPublic) {
      notYetVisible.push(m.id);
      continue;
    }
    if (isPast) {
      pastMeetups.push(m.id);
    }
  }

  let hint: string | null = null;
  if (!includePast && pastMeetups.length > 0) {
    hint = `${pastMeetups.length} past meetup(s) (ids: ${pastMeetups.join(", ")}) need Nostr fields — run npm run nostr:backfill:past`;
  } else if (notYetVisible.length > 0 && alreadyPublished.length === rows.length - notYetVisible.length - pastMeetups.length) {
    const onlyFuture = notYetVisible.filter((id) => !pastMeetups.includes(id));
    if (onlyFuture.length > 0 && pastMeetups.length === 0) {
      hint = `${onlyFuture.length} upcoming meetup(s) not yet public (visible_from in the future) — ids: ${onlyFuture.join(", ")}`;
    }
  }
  if (hint == null && alreadyPublished.length === rows.length) {
    hint = "All public meetups already have Nostr fields set.";
  }

  return { includePast, skipped: { alreadyPublished, notYetVisible, pastMeetups }, hint };
}

/** One-time backfill: publish meetings missing nostr_* fields (optional past meetups). */
export async function backfillMeetingsToNostr(opts: NostrPublishQueryOptions = {}): Promise<BackfillSummary> {
  const includePast = opts.includePast ?? false;
  const ids = await findMeetingsForNostrPublish({ ...opts, unpublishedOnly: true });
  const result = await publishMeetingIds(ids);
  const status = await summarizeBackfillStatus(includePast);
  return { ...result, ...status };
}

/** Public meetups to force-republish (ignores dirty state). */
export async function findMeetingsForRepublishAll(includePast: boolean): Promise<number[]> {
  const today = amsterdamTodayYmd();
  const rows = await prisma.meeting.findMany({
    where: { is_template: false },
    select: { id: true, meetup_date: true, visible_from: true },
    orderBy: { meetup_date: "asc" },
  });

  const ids: number[] = [];
  for (const m of rows) {
    if (!includePast && toAmsterdamYmd(m.meetup_date) < today) continue;
    if (!isMeetingPublicVisible(m.visible_from, today)) continue;
    ids.push(m.id);
  }
  return ids;
}

export async function republishAllMeetingsToNostr(opts: { includePast?: boolean } = {}): Promise<{
  includePast: boolean;
  attempted: number[];
  succeeded: number[];
  failed: { id: number; error: string }[];
  skippedNotVisible: number[];
}> {
  const includePast = opts.includePast ?? true;
  const today = amsterdamTodayYmd();
  const all = await prisma.meeting.findMany({
    where: { is_template: false },
    select: { id: true, meetup_date: true, visible_from: true },
  });
  const skippedNotVisible = all
    .filter((m) => !isMeetingPublicVisible(m.visible_from, today))
    .map((m) => m.id);

  const ids = await findMeetingsForRepublishAll(includePast);
  const result = await publishMeetingIds(ids, { deferCalendarCollection: true });
  return { includePast, ...result, skippedNotVisible };
}

export async function publishDueMeetings(): Promise<{
  attempted: number[];
  succeeded: number[];
  failed: { id: number; error: string }[];
}> {
  const ids = await findMeetingsDueForPublish();
  return publishMeetingIds(ids);
}
