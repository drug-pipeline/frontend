"use client";

import React, { useEffect, useMemo, useState } from "react";

/* =========================
   Types
   ========================= */

type PdbId = string | number;

type PdbEntry = {
  id?: string;
};

type PdbExptl = {
  method?: string;
};

type PdbStruct = {
  title?: string;
};

type PdbData = {
  entry?: PdbEntry;
  exptl?: PdbExptl[];
  struct?: PdbStruct;
};

type PDBProps = {
  pdbId?: PdbId;
};

type PdbApiEnvelope =
  | { content?: string } // 서버가 content에 문자열(JSON)을 담아주는 경우
  | Record<string, unknown>; // 일반 JSON

/* =========================
   Helpers
   ========================= */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/* =========================
   Component
   ========================= */

export default function PDB({ pdbId }: PDBProps) {
  const [pdbData, setPdbData] = useState<PdbData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 환경변수 → 기본값("/api/dk")
  const API_BASE = useMemo(() => {
    const fromEnv = process.env.NEXT_PUBLIC_DK_API_BASE;
    return fromEnv && fromEnv.length > 0 ? fromEnv : "/api/dk";
  }, []);

  useEffect(() => {
    if (!pdbId && pdbId !== 0) {
      setPdbData(null);
      setError(null);
      return;
    }

    const ac = new AbortController();
    const run = async () => {
      try {
        setError(null);
        setPdbData(null);

        // 쿼리스트링 구성
        const qs = new URLSearchParams();
        qs.set("id", String(pdbId));

        // 요청 엔드포인트 (요청하신 형태)
        const url = `${API_BASE}/api/pdb?${qs.toString()}`;
        console.log("[PDB] fetching:", url);
        const response = await fetch(url, { signal: ac.signal });
        console.log("[PDB] status:", response.status, response.statusText);


        if (!response.ok) {
  const text = await response.text().catch(() => "(no body)");
  console.error("[PDB] !ok, body:", text);
  throw new Error(`PDB fetch failed: ${response.status} ${response.statusText}`);
}
        // content-type에 따라 파싱 전략 분기
        const ctype = response.headers.get("content-type") ?? "";
        let parsed: PdbData | null = null;

        if (ctype.includes("application/json")) {
          const json = (await response.json()) as PdbApiEnvelope;

          // 서버가 {"content": "<json-string>"} 형태로 줄 수도 있음
          if (isRecord(json) && typeof json.content === "string") {
            // content 안의 JSON 문자열을 다시 파싱
            parsed = safeParseJson<PdbData>(json.content) ?? null;
          } else {
            // 일반 JSON을 PDB 데이터로 가정 (서버 응답이 이미 전개된 케이스)
            parsed = json as unknown as PdbData;
          }
        } else {
          // JSON이 아닌 경우(텍스트) → content에 JSON 문자열이 담겨있었다고 가정하고 파싱 시도
          const text = await response.text();
          parsed = safeParseJson<PdbData>(text);
        }

        if (!parsed) {
          throw new Error("Failed to parse PDB response.");
        }

        setPdbData(parsed);
      } catch (e) {
        if (ac.signal.aborted) return;
        console.error("Error fetching PDB data:", e);
        setError("Failed to fetch PDB data.");
      }
    };

    void run();
    return () => ac.abort();
  }, [API_BASE, pdbId]);

  if (!pdbId && pdbId !== 0) {
    return <div>No PDB ID provided.</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!pdbData) {
    return <div>Loading PDB data...</div>;
  }

  const { entry, exptl, struct } = pdbData;

  const handleOpenNewTab = () => {
    // 원래 사용하던 페이지 라우트 유지
    window.open(`/deepkinome/pdb?id=${encodeURIComponent(String(pdbId))}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="pdb-container p-6">
      <h4 className="text-lg font-light mb-4">PDB Information for {String(pdbId)}</h4>

      <table className="table-auto w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left">Field</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-medium">Entry</td>
            <td className="border border-gray-300 px-4 py-2">{entry?.id ?? "N/A"}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-medium">Experimental Method</td>
            <td className="border border-gray-300 px-4 py-2">{exptl?.[0]?.method ?? "N/A"}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-medium">Structure Title</td>
            <td className="border border-gray-300 px-4 py-2">{struct?.title ?? "N/A"}</td>
          </tr>
        </tbody>
      </table>

      <button
        onClick={handleOpenNewTab}
        className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after"
      >
        View More Details in New Tab
      </button>
    </div>
  );
}
