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
    const url = `${backend}/atom_graph/${encodeURIComponent(pdb)}_graph.json`;
    console.log("[/api/atom-graph]", { url });

    const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    const ct = r.headers.get("content-type") ?? "";
    console.log("[/api/atom-graph] response", { status: r.status, ok: r.ok, ct });

    if (ct.includes("application/json")) {
      const data = await r.json();
      console.log("[/api/atom-graph] data sample", JSON.stringify(data).slice(0, 300));
      return NextResponse.json(data, { status: r.status });
    }
    const text = await r.text();
    console.log("[/api/atom-graph] non-JSON", text.slice(0, 300));
    return new NextResponse(text, { status: r.status, headers: ct ? { "content-type": ct } : undefined });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/atom-graph] ERROR", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
