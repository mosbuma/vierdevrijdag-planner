import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit-log";
import { republishAllMeetingsToNostr } from "@/lib/nostr/publisher";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.isAdmin) return jsonError("Forbidden", 403);

  const url = new URL(req.url);
  const includePast = url.searchParams.get("includePast") !== "0";

  try {
    const summary = await republishAllMeetingsToNostr({ includePast });
    await writeAuditLog({
      username: auth.username,
      action: "nostr.republishAll",
      subject: "meetings",
      changes: {
        includePast,
        attempted: summary.attempted.length,
        succeeded: summary.succeeded.length,
        failed: summary.failed.length,
      },
    });
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Republish failed";
    return jsonError(msg, 500);
  }
}
