"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ViewerLike = Record<string, unknown> & { pdbName?: string | null };

type DistanceApiResponse = {
  data: Array<[number, number, number]>; // [x, y, value]
  x_categories: string[];
  y_categories: string[];
  min?: number;
  max?: number;
  imageUrl?: string; // API 라우트에서 주입
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function grayColor(t01: number) {
  const g = Math.round(clamp(t01, 0, 1) * 255);
  return `rgb(${g},${g},${g})`;
}

export default function DistanceMapPanel({ viewer }: { viewer: ViewerLike }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<DistanceApiResponse | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pdbName = (viewer?.pdbName as string | null) ?? "test";

  // 데이터 가져오기 (원본 스키마 그대로 사용)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/distance-map/${encodeURIComponent(pdbName)}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        const ct = r.headers.get("content-type") ?? "";
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        if (!ct.includes("application/json")) {
          const text = await r.text();
          throw new Error(`Non-JSON: ${text.slice(0, 160)}`);
        }
        const json = (await r.json()) as DistanceApiResponse;
        if (alive) setPayload(json);
      } catch (e) {
        if (alive) {
          setErr(e instanceof Error ? e.message : String(e));
          setPayload(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pdbName]);

  // min/max 계산 (없으면 data에서 추정)
  const [vMin, vMax] = useMemo<[number, number]>(() => {
    if (!payload?.data?.length) return [0, 1];
    let mn = Number.POSITIVE_INFINITY;
    let mx = Number.NEGATIVE_INFINITY;
    for (const [, , v] of payload.data) {
      if (Number.isFinite(v)) {
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
    }
    if (!Number.isFinite(mn)) mn = 0;
    if (!Number.isFinite(mx) || mx === mn) mx = mn + 1;
    return [payload.min ?? mn, payload.max ?? mx];
  }, [payload]);

  // 캔버스 그리기 (원본: 제목 Distance Matrix, x축 title Residue)
  useEffect(() => {
    const canvas = canvasRef.current;
    const holder = containerRef.current;
    if (!canvas || !holder || !payload) return;

    const nX = payload.x_categories?.length ?? 0;
    const nY = payload.y_categories?.length ?? 0;

    // 컨테이너 크기 기반 셀 크기
    const rect = holder.getBoundingClientRect();
    const pad = 12;
    const cellSize = Math.max(
      2,
      Math.floor(
        Math.min(
          (Math.max(rect.width, 480) - pad * 2) / Math.max(1, nX),
          (Math.max(rect.height, 320) - 80) / Math.max(1, nY)
        )
      )
    );

    const width = Math.max(100, nX * cellSize + pad * 2);
    const height = Math.max(100, nY * cellSize + 60);

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 배경
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    // 제목
    ctx.fillStyle = "#111";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Distance Matrix", pad, 18);

    // 히트맵
    const x0 = pad;
    const y0 = 28;

    // 전체 바탕 흰색
    ctx.fillStyle = "#fff";
    ctx.fillRect(x0, y0, nX * cellSize, nY * cellSize);

    // data: [x, y, value]
    for (const [x, y, value] of payload.data) {
      const t = (value - vMin) / (vMax - vMin);
      ctx.fillStyle = grayColor(t);
      ctx.fillRect(x0 + x * cellSize, y0 + y * cellSize, cellSize, cellSize);
    }

    // x축 텍스트 & 레전드
    ctx.fillStyle = "#333";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Residue", x0, y0 + nY * cellSize + 18);

    const lgX = x0 + Math.max(0, nX * cellSize - 160);
    const lgY = y0 + nY * cellSize + 8;
    const lgW = 140;
    const lgH = 10;

    for (let i = 0; i < lgW; i++) {
      const t = i / (lgW - 1);
      ctx.fillStyle = grayColor(t);
      ctx.fillRect(lgX + i, lgY, 1, lgH);
    }
    ctx.fillStyle = "#333";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(`${vMin.toFixed(2)}`, lgX, lgY + lgH + 12);
    ctx.fillText(`${vMax.toFixed(2)}`, lgX + lgW - 28, lgY + lgH + 12);
  }, [payload, vMin, vMax]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="shrink-0 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="text-sm font-semibold">Distance Map</div>
        <div className="text-xs text-neutral-500">PDB: {pdbName}</div>
      </div>

      <div ref={containerRef} className="grow overflow-auto p-3 space-y-3">
        {loading && <div className="text-sm text-neutral-600">Loading…</div>}
        {err && <div className="text-sm text-red-600">Error: {err}</div>}

        {!!payload?.imageUrl && !loading && !err && (
          <img
            src={payload.imageUrl}
            alt="distance matrix preview"
            className="block max-w-full h-auto rounded-lg border border-neutral-200 dark:border-neutral-800"
          />
        )}

        {!loading && !err && (
          <div className="min-w-[360px] min-h-[240px]">
            <canvas ref={canvasRef} className="block max-w-full h-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
