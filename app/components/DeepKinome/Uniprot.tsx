"use client";

import React, { useEffect, useMemo, useState } from "react";

/* =========================
   Types
   ========================= */

type UniprotId = string | number;

type UniProtNameValue = {
  value?: string;
};

type UniProtRecommendedName = {
  fullName?: UniProtNameValue;
};

type UniProtAlternativeName = {
  fullName?: UniProtNameValue;
};

type UniProtProtein = {
  recommendedName?: UniProtRecommendedName;
  alternativeName?: UniProtAlternativeName[];
};

type UniProtData = {
  id?: string;
  accession?: string;
  protein?: UniProtProtein;
};

type UniprotProps = {
  uniprotId?: UniprotId;
};

type ApiEnvelope =
  | { content?: string } // 서버가 content에 JSON 문자열을 담아주는 경우
  | Record<string, unknown>; // 일반 JSON

/* =========================
   Helpers
   ========================= */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

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

export default function Uniprot({ uniprotId }: UniprotProps) {
  const [uniprotData, setUniprotData] = useState<UniProtData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 환경변수 우선, 없으면 기본값 "/api/dk"
  const API_BASE = useMemo(() => {
    const fromEnv = process.env.NEXT_PUBLIC_DK_API_BASE;
    return fromEnv && fromEnv.length > 0 ? fromEnv : "/api/dk";
  }, []);

  useEffect(() => {
    if (!uniprotId && uniprotId !== 0) {
      setUniprotData(null);
      setError(null);
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      try {
        setError(null);
        setUniprotData(null);

        const qs = new URLSearchParams();
        qs.set("id", String(uniprotId));

        // Uniprot용 엔드포인트
        const url = `${API_BASE}/api/uniprot?${qs.toString()}`;
        const response = await fetch(url, { signal: ac.signal });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const ctype = response.headers.get("content-type") ?? "";
        let parsed: UniProtData | null = null;

        if (ctype.includes("application/json")) {
          const json = (await response.json()) as ApiEnvelope;

          // {"content":"<json-string>"} 형태 대응
          if (isRecord(json) && typeof json.content === "string") {
            parsed = safeParseJson<UniProtData>(json.content);
          } else {
            parsed = json as unknown as UniProtData;
          }
        } else {
          // 텍스트 응답에 JSON 문자열이 들어있는 경우
          const text = await response.text();
          parsed = safeParseJson<UniProtData>(text);
        }

        if (!parsed) {
          throw new Error("Failed to parse UniProt response.");
        }

        setUniprotData(parsed);
      } catch (e) {
        if (ac.signal.aborted) return;
        console.error("Error fetching UniProt data:", e);
        setError("Failed to fetch Uniprot data.");
      }
    };

    void run();
    return () => ac.abort();
  }, [API_BASE, uniprotId]);

  if (!uniprotId && uniprotId !== 0) {
    return <div>No Uniprot ID provided.</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!uniprotData) {
    return <div>Loading Uniprot data...</div>;
  }

  // 렌더링 데이터
  const { id, accession, protein } = uniprotData;
  const fullName = protein?.recommendedName?.fullName?.value ?? "N/A";
  const alternativeNames =
    protein?.alternativeName?.map((alt) => alt?.fullName?.value ?? "N/A") ?? ["N/A"];

  const handleOpenNewTab = () => {
    window.open(`/deepkinome/uniprot?id=${encodeURIComponent(String(uniprotId))}`, "_blank", "noopener,noreferrer");
  };
  const handleOpenStructure = () => {
    window.open(
      `/deepkinome/uniprot/structure?id=${encodeURIComponent(String(uniprotId))}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
  const handleOpenFeatures = () => {
    window.open(
      `/deepkinome/uniprot/features?id=${encodeURIComponent(String(uniprotId))}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="uniprot-container p-6">
      <h4 className="text-lg font-light mb-4">Uniprot Information for {String(uniprotId)}</h4>

      <table className="table-auto w-full border-collapse border border-gray-300 mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-left">Field</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-medium">ID</td>
            <td className="border border-gray-300 px-4 py-2">{id ?? "N/A"}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-medium">Accession</td>
            <td className="border border-gray-300 px-4 py-2">{accession ?? "N/A"}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-medium">Full Name</td>
            <td className="border border-gray-300 px-4 py-2">{fullName}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-medium">Alternative Names</td>
            <td className="border border-gray-300 px-4 py-2">
              {alternativeNames.map((name, idx) => (
                <div key={`${name}-${idx}`}>{name}</div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleOpenNewTab}
          className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after"
        >
          View More Details in New Tab
        </button>
        <button
          onClick={handleOpenStructure}
          className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after"
        >
          Open Structure
        </button>
        <button
          onClick={handleOpenFeatures}
          className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after"
        >
          Open Features
        </button>
      </div>
    </div>
  );
}
