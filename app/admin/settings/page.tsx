import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { NostrSettingsForm } from "@/components/NostrSettingsForm";
import {
  getNostrSettings,
  getNostrSettingsOptional,
  nostrSettingsToClient,
} from "@/lib/nostr/settings";
import { nip05Identifier } from "@/lib/nostr/settings-schema";
import { tryLoadServerPubkey } from "@/lib/nostr/keys";

export default async function SettingsAdminPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isAdmin) redirect("/admin");

  let row = await getNostrSettingsOptional();
  if (!row) {
    try {
      row = await getNostrSettings();
    } catch {
      row = null;
    }
  }
  const key = tryLoadServerPubkey();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Instellingen</h1>
      <p className="mt-2 text-slate-400">Nostr-profiel, relays, kalender-events en collectie.</p>
      {!row ? (
        <p className="mt-4 rounded border border-amber-700/60 bg-amber-950/35 px-3 py-2 text-sm text-amber-100">
          Nog geen instellingen in de database — bij eerste laden worden standaardwaarden aangemaakt.
        </p>
      ) : null}
      <NostrSettingsForm
        initial={row ? nostrSettingsToClient(row) : null}
        npub={key?.npub ?? null}
        pkHex={key?.pkHex ?? null}
        nip05Preview={row ? nip05Identifier(row.profile_name, row.nip05_domain) : null}
      />
    </div>
  );
}
