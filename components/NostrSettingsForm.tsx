"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NostrSettingsClient } from "@/lib/nostr/settings";
import { DEFAULT_NOSTR_SETTINGS } from "@/lib/nostr/settings-bootstrap";

type Props = {
  initial: NostrSettingsClient | null;
  npub: string | null;
  pkHex: string | null;
  nip05Preview: string | null;
};

const emptyForm: NostrSettingsClient = {
  ...DEFAULT_NOSTR_SETTINGS,
  updated_at: "",
};

type SettingsTab = "sleutels" | "relays" | "meetup" | "collectie";

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "sleutels", label: "NOSTR Sleutels" },
  { id: "relays", label: "Relays & NIP-05" },
  { id: "meetup", label: "Meetup-events" },
  { id: "collectie", label: "Collectie" },
];

export function NostrSettingsForm({ initial, npub, pkHex, nip05Preview }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<NostrSettingsClient>(initial ?? emptyForm);
  const [nip05, setNip05] = useState(nip05Preview);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("sleutels");

  function setField<K extends keyof NostrSettingsClient>(key: K, value: NostrSettingsClient[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/nostr-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          profile_picture_url: form.profile_picture_url?.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        settings?: NostrSettingsClient;
        nip05Preview?: string;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Opslaan mislukt");
        return;
      }
      if (data.settings) setForm(data.settings);
      if (data.nip05Preview) setNip05(data.nip05Preview);
      setMsg("Opgeslagen.");
      router.refresh();
    } catch {
      setMsg("Netwerkfout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-3xl space-y-6">
      {msg ? (
        <p className={`text-sm ${msg === "Opgeslagen." ? "text-teal-400" : "text-red-400"}`}>{msg}</p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-700" role="tablist" aria-label="Nostr-instellingen">
        {SETTINGS_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            id={`settings-tab-${id}`}
            aria-controls={`settings-panel-${id}`}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id
                ? "border-teal-500 text-white"
                : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "sleutels" && (
      <section
        className="rounded-lg border border-slate-700 p-4"
        role="tabpanel"
        id="settings-panel-sleutels"
        aria-labelledby="settings-tab-sleutels"
      >
        <h2 className="text-lg font-semibold text-white">NOSTR Sleutels (alleen .env)</h2>
        <p className="mt-2 text-sm text-slate-400">
          <code className="text-slate-300">NOSTR_NPUB</code> en <code className="text-slate-300">NOSTR_NSEC</code>{" "}
          blijven in het environment (niet in de database). Cron-token:{" "}
          <code className="text-slate-300">NOSTR_CRON_TOKEN</code>.
        </p>
        {npub ? (
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-slate-400">npub</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-slate-300">{npub}</dd>
            </div>
            {pkHex ? (
              <div>
                <dt className="text-slate-400">pub key (hex)</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-slate-300">{pkHex}</dd>
              </div>
            ) : null}
            {nip05 ? (
              <div>
                <dt className="text-slate-400">NIP-05</dt>
                <dd className="mt-0.5">
                  <code className="text-teal-300">{nip05}</code>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-amber-300">Geen NOSTR_NPUB/NOSTR_NSEC geconfigureerd.</p>
        )}
      </section>
      )}

      {activeTab === "relays" && (
      <section
        className="space-y-4 rounded-lg border border-slate-700 p-4"
        role="tabpanel"
        id="settings-panel-relays"
        aria-labelledby="settings-tab-relays"
      >
        <h2 className="text-lg font-semibold text-white">Relays &amp; NIP-05</h2>
        <div>
          <label htmlFor="relays">Relays (komma-gescheiden wss://…)</label>
          <textarea
            id="relays"
            className="mt-1 w-full font-mono text-sm"
            rows={3}
            value={form.relays}
            onChange={(e) => setField("relays", e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="nip05_domain">NIP-05 domein</label>
          <input
            id="nip05_domain"
            className="mt-1 w-full"
            value={form.nip05_domain}
            onChange={(e) => setField("nip05_domain", e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="content_site_origin">Publieke site-URL (links in Nostr-events)</label>
          <input
            id="content_site_origin"
            className="mt-1 w-full font-mono text-sm"
            value={form.content_site_origin}
            onChange={(e) => setField("content_site_origin", e.target.value)}
            placeholder="https://vierdevrijdag.org"
            required
          />
          <p className="mt-1 text-xs text-slate-400">
            Gebruikt voor event- en poster-URLs in gepubliceerde kalender-events, ook bij publiceren vanaf localhost.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile_name">Profielnaam (lokaal deel NIP-05)</label>
            <input
              id="profile_name"
              className="mt-1 w-full"
              value={form.profile_name}
              onChange={(e) => setField("profile_name", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="profile_display_name">Weergavenaam (kind:0)</label>
            <input
              id="profile_display_name"
              className="mt-1 w-full"
              value={form.profile_display_name}
              onChange={(e) => setField("profile_display_name", e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="profile_picture_url">Profielafbeelding URL (optioneel)</label>
          <input
            id="profile_picture_url"
            className="mt-1 w-full"
            value={form.profile_picture_url ?? ""}
            onChange={(e) => setField("profile_picture_url", e.target.value || null)}
          />
        </div>
        <div>
          <label htmlFor="profile_about">Profiel bio</label>
          <textarea
            id="profile_about"
            className="mt-1 w-full"
            rows={3}
            value={form.profile_about}
            onChange={(e) => setField("profile_about", e.target.value)}
            required
          />
        </div>
      </section>
      )}

      {activeTab === "meetup" && (
      <section
        className="space-y-4 rounded-lg border border-slate-700 p-4"
        role="tabpanel"
        id="settings-panel-meetup"
        aria-labelledby="settings-tab-meetup"
      >
        <h2 className="text-lg font-semibold text-white">Meetup-events</h2>
        <div>
          <label htmlFor="event_hashtags">Hashtags (komma-gescheiden, leeg = geen)</label>
          <input
            id="event_hashtags"
            className="mt-1 w-full"
            value={form.event_hashtags}
            onChange={(e) => setField("event_hashtags", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="event_d_tag_prefix">d-tag prefix (bijv. vierdevrijdag → vierdevrijdag-20260626)</label>
          <input
            id="event_d_tag_prefix"
            className="mt-1 w-full font-mono"
            value={form.event_d_tag_prefix}
            onChange={(e) => setField("event_d_tag_prefix", e.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="timezone">Tijdzone (IANA)</label>
            <input
              id="timezone"
              className="mt-1 w-full"
              value={form.timezone}
              onChange={(e) => setField("timezone", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="meetup_default_start">Standaard start (HH:mm)</label>
            <input
              id="meetup_default_start"
              className="mt-1 w-full"
              value={form.meetup_default_start}
              onChange={(e) => setField("meetup_default_start", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="meetup_default_end">Standaard eind (HH:mm)</label>
            <input
              id="meetup_default_end"
              className="mt-1 w-full"
              value={form.meetup_default_end}
              onChange={(e) => setField("meetup_default_end", e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="deletion_reason">Tekst bij verwijderverzoek (kind:5)</label>
          <input
            id="deletion_reason"
            className="mt-1 w-full"
            value={form.deletion_reason}
            onChange={(e) => setField("deletion_reason", e.target.value)}
            required
          />
        </div>
      </section>
      )}

      {activeTab === "collectie" && (
      <section
        className="space-y-4 rounded-lg border border-slate-700 p-4"
        role="tabpanel"
        id="settings-panel-collectie"
        aria-labelledby="settings-tab-collectie"
      >
        <h2 className="text-lg font-semibold text-white">Kalender-collectie (kind:31924)</h2>
        <div>
          <label htmlFor="calendar_collection_d_tag">Collectie d-tag</label>
          <input
            id="calendar_collection_d_tag"
            className="mt-1 w-full font-mono"
            value={form.calendar_collection_d_tag}
            onChange={(e) => setField("calendar_collection_d_tag", e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="calendar_collection_title">Collectietitel</label>
          <input
            id="calendar_collection_title"
            className="mt-1 w-full"
            value={form.calendar_collection_title}
            onChange={(e) => setField("calendar_collection_title", e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="calendar_collection_description">Collectiebeschrijving</label>
          <textarea
            id="calendar_collection_description"
            className="mt-1 w-full"
            rows={3}
            value={form.calendar_collection_description}
            onChange={(e) => setField("calendar_collection_description", e.target.value)}
            required
          />
        </div>
      </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
        {form.updated_at ? (
          <span className="text-sm text-slate-500">
            Laatst opgeslagen: {new Date(form.updated_at).toLocaleString("nl-NL")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
