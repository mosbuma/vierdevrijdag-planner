import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit-log";
import {
  getNostrSettingsOptional,
  nostrSettingsToClient,
  updateNostrSettings,
} from "@/lib/nostr/settings";
import { nostrSettingsInputSchema } from "@/lib/nostr/settings-schema";
import { nip05Identifier } from "@/lib/nostr/settings-schema";
import { tryLoadServerPubkey } from "@/lib/nostr/keys";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    return jsonError(msg, msg === "Unauthorized" ? 401 : 403);
  }

  const row = await getNostrSettingsOptional();
  const key = tryLoadServerPubkey();
  return NextResponse.json({
    settings: row ? nostrSettingsToClient(row) : null,
    npub: key?.npub ?? null,
    nip05Preview: row ? nip05Identifier(row.profile_name, row.nip05_domain) : null,
  });
}

export async function PUT(req: Request) {
  let auth;
  try {
    auth = await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    return jsonError(msg, msg === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = nostrSettingsInputSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return jsonError(first?.message ?? "Invalid body", 400);
  }

  try {
    const before = await getNostrSettingsOptional();
    const row = await updateNostrSettings(parsed.data);
    await writeAuditLog({
      username: auth.username,
      action: "nostr.updateSettings",
      subject: "nostr_settings",
      changes: { before: before ? nostrSettingsToClient(before) : null, after: nostrSettingsToClient(row) },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/nostr");
    return NextResponse.json({
      settings: nostrSettingsToClient(row),
      nip05Preview: nip05Identifier(row.profile_name, row.nip05_domain),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return jsonError(msg, 400);
  }
}
