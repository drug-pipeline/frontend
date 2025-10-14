"use client";

import React, { useEffect, useState } from "react";

/* =========================
   Types
   ========================= */
type UniprotId = string | number;

type UniProtNameValue = { value?: string };
type UniProtRecommendedName = { fullName?: UniProtNameValue };
type UniProtAlternativeName = { fullName?: UniProtNameValue };
type UniProtProtein = {
  recommendedName?: UniProtRecommendedName;
  alternativeName?: UniProtAlternativeName[];
};
type UniProtData = {
  id?: string;
  accession?: string;
  protein?: UniProtProtein;
};

type UniprotProps = { uniprotId?: UniprotId };

type ApiEnvelope = { content: string } | Record<string, unknown>;

/* =========================
   Helpers
   ========================= */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasContentString(v: unknown): v is { content: string } {
  return isRecord(v) && typeof v.content === "string";
}

function isUniProtData(v: unknown): v is UniProtData {
  if (!isRecord(v)) return false;
  // Minimal structural checks; relax as needed
  const maybeProtein = v.protein;
  const okId = typeof v.id === "string" || typeof v.id === "undefined";
  const okAcc = typeof v.accession === "string" || typeof v.accession === "undefined";
  const okProtein =
    typeof maybeProtein === "undefined" ||
    isRecord(maybeProtein); // deep validation optional
  return okId && okAcc && okProtein;
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
export default function Uniprot({ uniprotId }: UniprotProps) {
  const [uniprotData, setUniprotData] = useState<UniProtData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SIMPLE style base (matches your other DeepKinome calls)
  const API_BASE = "http://34.61.162.19/api/deepkinome";

  useEffect(() => {
    if (uniprotId === undefined || uniprotId === null) {
      setUniprotData(null);
      setError(null);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setError(null);
        setUniprotData(null);

        const qs = new URLSearchParams({ id: String(uniprotId) });
        const url = `${API_BASE}/uniprot?${qs.toString()}`;
        const response = await fetch(url, { signal: ac.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const ctype = response.headers.get("content-type") ?? "";
        let parsed: UniProtData | null = null;

        if (ctype.includes("application/json")) {
          const json: unknown = await response.json();

          if (hasContentString(json)) {
            parsed = safeParseJson<UniProtData>(json.content);
          } else if (isUniProtData(json)) {
            parsed = json;
          }
        } else {
          const text = await response.text();
          parsed = safeParseJson<UniProtData>(text);
        }

        if (!parsed) throw new Error("Failed to parse UniProt response.");
        setUniprotData(parsed);
      } catch (e) {
        if (!ac.signal.aborted) {
          console.error("Error fetching UniProt data:", e);
          setError("Failed to fetch Uniprot data.");
        }
      }
    })();

    return () => ac.abort();
  }, [API_BASE, uniprotId]);

  if (uniprotId === undefined || uniprotId === null) {
    return <div>No Uniprot ID provided.</div>;
  }
  if (error) return <div>{error}</div>;
  if (!uniprotData) return <div>Loading Uniprot data...</div>;

  const { id, accession, protein } = uniprotData;
  const fullName = protein?.recommendedName?.fullName?.value ?? "N/A";
  const alternativeNames =
    protein?.alternativeName?.map((alt) => alt?.fullName?.value ?? "N/A") ?? ["N/A"];

  // If you want these to hit your proxy API endpoints in a new tab:
  const openNewTab = () =>
    window.open(
      `/deepkinome/uniprot?id=${encodeURIComponent(String(uniprotId))}`,
      "_blank",
      "noopener,noreferrer"
    );
  const openStructure = () =>
    window.open(
      `${API_BASE}/uniprot/structure?id=${encodeURIComponent(String(uniprotId))}`,
      "_blank",
      "noopener,noreferrer"
    );
  const openFeatures = () =>
    window.open(
      `${API_BASE}/uniprot/features?id=${encodeURIComponent(String(uniprotId))}`,
      "_blank",
      "noopener,noreferrer"
    );

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
        <button onClick={openNewTab} className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after">
          View More Details in New Tab
        </button>
        <button onClick={openStructure} className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after">
          Open Structure
        </button>
        <button onClick={openFeatures} className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after">
          Open Features
        </button>
      </div>
    </div>
  );
}
