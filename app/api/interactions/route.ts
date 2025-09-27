// /app/api/interactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs"; // fs 사용

type Toggles = Record<string, boolean>;

export async function POST(req: NextRequest) {
  try {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backend) {
      console.error("❌ NEXT_PUBLIC_BACKEND_URL is not set");
      return NextResponse.json({ error: "NEXT_PUBLIC_BACKEND_URL is not set" }, { status: 500 });
    }
    console.log("✅ Backend URL:", backend);

    const { seleLeft, seleRight, toggles } = (await req.json()) as {
      seleLeft: string;
      seleRight: string;
      toggles: Toggles;
    };
    console.log("📩 Incoming body:", { seleLeft, seleRight, toggles });

    // public/data/test.pdb 읽기
    const pdbAbsPath = path.join(process.cwd(), "public", "data", "test.pdb");
    const buf = await fs.readFile(pdbAbsPath);
    console.log("📂 File loaded:", pdbAbsPath, "size =", buf.byteLength);

    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const blob = new Blob([ab], { type: "chemical/x-pdb" });
    console.log("🧪 Blob created:", blob.size, "bytes");

    const form = new FormData();
    form.append("file", blob, "test.pdb");
    form.append("seleLeft", seleLeft);
    form.append("seleRight", seleRight);
    form.append("toggles", JSON.stringify(toggles));

    console.log("🚀 Sending request to Flask...");
    const r = await fetch(`${backend}/uploads`, {
      method: "POST",
      body: form,
    });
    console.log("📡 Flask responded with status:", r.status);

    const ct = r.headers.get("content-type") ?? "";
    console.log("📡 Flask response Content-Type:", ct);

    if (!r.ok) {
      const text = ct.includes("application/json") ? JSON.stringify(await r.json()) : await r.text();
      console.error("❌ Flask error response:", text);
      return new NextResponse(text, { status: r.status });
    }
    if (ct.includes("application/json")) {
      const data = await r.json();
      
      console.log("✅ Flask JSON response:", data);
      return NextResponse.json(data, { status: r.status });
    }
    const text = await r.text();
    console.log("✅ Flask text response:", text);
    return new NextResponse(text, { status: r.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
