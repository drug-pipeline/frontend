import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ pdb: string }> }
) {
  try {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backend) {
      return NextResponse.json({ error: "NEXT_PUBLIC_BACKEND_URL is not set" }, { status: 500 });
    }

    const { pdb } = await ctx.params;               // ✅ await
    const url = `${backend}/json/${encodeURIComponent(pdb)}.json`;
    console.log("[/api/json]", { url });

    const r = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json, text/plain;q=0.9, */*;q=0.8" },
    });
    const ct = r.headers.get("content-type") ?? "";
    console.log("[/api/json] response", { status: r.status, ok: r.ok, ct });

    if (ct.includes("application/json")) {
      const data = await r.json();
      console.log("[/api/json] data sample", JSON.stringify(data).slice(0, 300));
      return NextResponse.json(data, { status: r.status });
    }
    const text = await r.text();
    console.log("[/api/json] non-JSON", text.slice(0, 300));
    return new NextResponse(text, { status: r.status, headers: ct ? { "content-type": ct } : undefined });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/json] ERROR", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
