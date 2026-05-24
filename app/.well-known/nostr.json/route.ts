import { NextResponse } from "next/server";
import { buildNip05Json } from "@/lib/nostr/nip05";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function GET(req: Request) {
  const doc = buildNip05Json();
  if (!doc) {
    return NextResponse.json({ error: "Nostr not configured" }, { status: 503, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  if (name != null && name !== "") {
    const pubkey = doc.names[name];
    if (!pubkey) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json(
      { names: { [name]: pubkey }, relays: { [pubkey]: doc.relays[pubkey] ?? [] } },
      { headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(doc, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
