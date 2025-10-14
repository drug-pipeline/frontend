"use client";

import React, { useEffect, useState } from "react";

/* =========================
   Types
   ========================= */

type PdbId = string | number;

type PdbEntry = { id?: string };
type PdbExptl = { method?: string };
type PdbStruct = { title?: string };
type PdbData = {
  entry?: PdbEntry;
  exptl?: PdbExptl[];
  struct?: PdbStruct;
};

type PDBProps = { pdbId?: PdbId };

type PdbApiEnvelope = { content?: string } | Record<string, unknown>;

/* =========================
   Helpers
   ========================= */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasContentString(v: unknown): v is { content: string } {
  return isRecord(v) && typeof v.content === "string";
}

function isPdbData(v: unknown): v is PdbData {
  if (!isRecord(v)) return false;
  // 최소 구조만 확인 (필요시 더 강화 가능)
  const okEntry =
    typeof v.entry === "undefined" ||
    (isRecord(v.entry) && (typeof v.entry.id === "string" || typeof v.entry.id === "undefined"));
  const okExptl =
    typeof v.exptl === "undefined" ||
    (Array.isArray(v.exptl) &&
      v.exptl.every((e) => isRecord(e) && (typeof e.method === "string" || typeof e.method === "undefined")));
  const okStruct =
    typeof v.struct === "undefined" ||
    (isRecord(v.struct) && (typeof v.struct.title === "string" || typeof v.struct.title === "undefined"));
  return okEntry && okExptl && okStruct;
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

  // SIMPLE style API base (백엔드 프록시와 동일)
  const API_BASE = "http://34.61.162.19/api/deepkinome";

  useEffect(() => {
    if (pdbId === undefined || pdbId === null) {
      setPdbData(null);
      setError(null);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setError(null);
        setPdbData(null);

        const qs = new URLSearchParams({ id: String(pdbId) });
        const url = `${API_BASE}/pdb?${qs.toString()}`;
        console.log("[PDB] fetching:", url);

        const response = await fetch(url, { signal: ac.signal, cache: "no-store" });
        console.log("[PDB] status:", response.status, response.statusText);

        if (!response.ok) {
          const text = await response.text().catch(() => "(no body)");
          console.error("[PDB] !ok, body:", text);
          throw new Error(`PDB fetch failed: ${response.status} ${response.statusText}`);
        }

        const ctype = response.headers.get("content-type") ?? "";
        let parsed: PdbData | null = null;

        if (ctype.includes("application/json")) {
          const json: unknown = (await response.json()) as PdbApiEnvelope;

          if (hasContentString(json)) {
            parsed = safeParseJson<PdbData>(json.content);
          } else if (isPdbData(json)) {
            parsed = json;
          }
        } else {
          const text = await response.text();
          parsed = safeParseJson<PdbData>(text);
        }

        if (!parsed) throw new Error("Failed to parse PDB response.");
        setPdbData(parsed);
      } catch (e) {
        if (ac.signal.aborted) return;
        console.error("Error fetching PDB data:", e);
        setError("Failed to fetch PDB data.");
      }
    })();

    return () => ac.abort();
  }, [API_BASE, pdbId]);

  if (pdbId === undefined || pdbId === null) {
    return <div>No PDB ID provided.</div>;
  }

  if (error) return <div>{error}</div>;
  if (!pdbData) return <div>Loading PDB data...</div>;

  const { entry, exptl, struct } = pdbData;

  const handleOpenNewTab = () => {
    window.open(
      `/deepkinome/pdb?id=${encodeURIComponent(String(pdbId))}`,
      "_blank",
      "noopener,noreferrer"
    );
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
