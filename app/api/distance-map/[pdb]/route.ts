import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: { pdb: string } }
) {
  try {
    const { pdb } = ctx.params;
    const pdbName = decodeURIComponent(pdb);

    // 고정 경로 2개만 사용
    const matrixUrl = `http://192.168.150.30:5000/matrix_high/${encodeURIComponent(
      pdbName
    )}_matrix.json`;
    const imageUrl = `http://192.168.150.30:5000/matrix_image/${encodeURIComponent(
      pdbName
    )}_matrix.png`;

    const r = await fetch(matrixUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const ct = r.headers.get("content-type") ?? "";
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: `HTTP ${r.status} ${r.statusText}`, detail: text.slice(0, 300) },
        { status: r.status }
      );
    }
    if (!ct.includes("application/json")) {
      const text = await r.text();
      return NextResponse.json(
        { error: "Non-JSON response", detail: text.slice(0, 300) },
        { status: 502 }
      );
    }

    // 원본 JSON (xLabels, yLabels, matrix 또는 data…)을 그대로 받고 imageUrl만 주입
    const base = await r.json();

    return NextResponse.json(
      {
        ...base,
        imageUrl, // 프리뷰 이미지 바로 접근 가능
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
