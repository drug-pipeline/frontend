"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

// Heatmaps & Viewer
import SelectivityMap, {
  SelectivityMapClickPayload,
} from "./DeepKinome/SelectivityMap";
import DockingMap, { toStringMatrix } from "./DeepKinome/DockingMap";
import Visualizer from "./DeepKinome/Visualizer";

// Bottom cards
import ADMET, { AdmetData } from "./DeepKinome/ADMET";
import Uniprot from "./DeepKinome/Uniprot";
import PDB from "./DeepKinome/PDB";
import PdbData from "./DeepKinome/PdbData";

// Types
type HeatmapMatrix = (string | number)[][];
type MatchingItem = { cid: string; value: string | number };
type MatchingList = MatchingItem[];
type AdmetDict = Record<string, { admet_prediction: AdmetData }>;
type SmilesDict = Record<string, string>;

type Props = {
  taskId?: string;
  basePath?: string; // optional override for API base
};

export default function DeepKinomePanel({
  taskId: taskIdProp,
  basePath,
}: Props) {
  const searchParams = useSearchParams();

  // ---- core states ----
  const [taskId, setTaskId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // which heatmap
  const [active, setActive] = useState<"selectivity" | "docking">(
    "selectivity"
  );

  // data
  const [selectivityData, setSelectivityData] = useState<HeatmapMatrix>([]);
  const [dockingData, setDockingData] = useState<HeatmapMatrix>([]);
  const [matchingList, setMatchingList] = useState<MatchingList>([]);
  const [admet, setAdmet] = useState<AdmetDict>({});
  const [smiles, setSmiles] = useState<SmilesDict>({});

  // selection → other panes
  const [selUniprot, setSelUniprot] = useState<string | null>(null);
  const [selCidForViewer, setSelCidForViewer] = useState<string | null>(null);
  const [selCidForAdmet, setSelCidForAdmet] = useState<string | null>(null);

  // derived: UniProt → PDB 매핑 결과
  const [pdbId, setPdbId] = useState<string | null>(null);

  // read taskId from prop or URL
  useEffect(() => {
    if (taskIdProp && taskIdProp.length > 0) {
      setTaskId(taskIdProp);
      return;
    }
    const q = searchParams.get("taskId");
    if (q) setTaskId(q);
  }, [searchParams, taskIdProp]);

  // API base
  const API_BASE = "http://34.61.162.19/api/deepkinome"

  // fetch dashboard data
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!taskId) return;
      setLoading(true);
      setError(null);
      try {
        const [pRes, dRes, aRes, sRes, mRes] = await Promise.all([
          fetch(`${API_BASE}/prediction?taskId=${encodeURIComponent(taskId)}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE}/docking?taskId=${encodeURIComponent(taskId)}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE}/admet?taskId=${encodeURIComponent(taskId)}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE}/smiles?taskId=${encodeURIComponent(taskId)}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE}/matching?taskId=${encodeURIComponent(taskId)}`, {
            cache: "no-store",
          }),
        ]);

        if (!pRes.ok || !dRes.ok || !aRes.ok || !sRes.ok || !mRes.ok) {
          const statuses = [pRes, dRes, aRes, sRes, mRes]
            .map((r) => r.status)
            .join(", ");
          throw new Error(`HTTP error: ${statuses}`);
        }

        const [pred, dock, admetJson, smilesJson, matching]: [
          HeatmapMatrix,
          HeatmapMatrix,
          AdmetDict,
          SmilesDict,
          MatchingList
        ] = await Promise.all([
          pRes.json(),
          dRes.json(),
          aRes.json(),
          sRes.json(),
          mRes.json(),
        ]);

        if (!alive) return;
        setSelectivityData(pred ?? []);
        setDockingData(dock ?? []);
        setAdmet(admetJson ?? {});
        setSmiles(smilesJson ?? {});
        setMatchingList(matching ?? []);
      } catch (e) {
        console.error("[DeepKinomePanel] load failed:", e);
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [taskId, API_BASE]);

  // cell click → propagate selection + PDB mapping
  const onCellClick = (cell: SelectivityMapClickPayload) => {
    const pickedUniprot = (cell.uniprotId ?? "").trim().toUpperCase();
    setSelUniprot(pickedUniprot || null);

    // select CID (viewer/admet)
    const m =
      active === "selectivity"
        ? matchingList.find((x) => x.cid === cell.cid)
        : matchingList.find((x) => String(x.value) === String(cell.cid));

    setSelCidForViewer(m ? String(m.value) : cell.cid ?? null);
    setSelCidForAdmet(m ? m.cid : cell.cid ?? null);

    // robust UniProt → PDB map (defensive)
    console.log("[onCellClick] raw payload:", cell);
    console.log("[onCellClick] pickedUniprot(before norm):", cell.uniprotId);

    const normUni = (cell.uniprotId ?? "").trim().toUpperCase();
    console.log(
      "[onCellClick] normUni:",
      normUni,
      "PdbData size:",
      Array.isArray(PdbData) ? PdbData.length : "NA"
    );

    const matched =
      Array.isArray(PdbData) && normUni
        ? PdbData.find(
          (e) => (e.uniprot ?? "").trim().toUpperCase() === normUni
        )
        : undefined;

    if (!matched) {
      console.warn("[PDB map] NO MATCH for UniProt:", normUni);
    } else {
      console.log("[PDB map] MATCH:", matched);
    }
    setPdbId(matched?.pdbId ?? null);
  };

  // ---- UI blocks ------------------------------------------------------------

  const heatmap = (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm h-[65vh] min-h-[480px]">
      {/* mini segmented control */}
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-xl border border-neutral-200 p-1 shadow-sm">
          <button
            onClick={() => setActive("selectivity")}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${active === "selectivity"
                ? "bg-black text-white shadow"
                : "text-gray-700 hover:bg-neutral-100"
              }`}
          >
            Selectivity
          </button>
          <button
            onClick={() => setActive("docking")}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${active === "docking"
                ? "bg-black text-white shadow"
                : "text-gray-700 hover:bg-neutral-100"
              }`}
          >
            Docking
          </button>
        </div>
      </div>

      {!taskId ? (
        <div className="grid h-full place-items-center text-sm text-gray-500">
          Waiting for taskId…
        </div>
      ) : loading ? (
        <div className="grid h-full place-items-center text-sm text-gray-500">
          Loading…
        </div>
      ) : error ? (
        <div className="grid h-full place-items-center text-sm text-red-600">
          Failed to load: {error}
        </div>
      ) : active === "selectivity" ? (
        selectivityData.length > 0 ? (
          <SelectivityMap data={selectivityData} onCellClick={onCellClick} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-gray-500">
            No selectivity data.
          </div>
        )
      ) : dockingData.length > 0 ? (
        <DockingMap
          data={toStringMatrix(dockingData)}
          onCellClick={onCellClick}
        />
      ) : (
        <div className="grid h-full place-items-center text-sm text-gray-500">
          No docking data.
        </div>
      )}
    </div>
  );

  const viewer = (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm h-[65vh] min-h-[480px] flex flex-col min-w-0">
      <div className="mb-3 text-xs text-gray-500 shrink-0">
        {selUniprot && selCidForViewer ? (
          <span>
            UniProt: <b>{selUniprot}</b> • CID: <b>{selCidForViewer}</b>
          </span>
        ) : (
          <span>Select a cell on the heatmap</span>
        )}
      </div>
      {selUniprot && selCidForViewer && taskId ? (
        <div className="h-full w-full overflow-hidden rounded-xl">
          <Visualizer
            uniprotId={selUniprot}
            cid={selCidForViewer}
            taskId={taskId}
          />
        </div>
      ) : (
        <div className="grid h-full place-items-center text-sm text-gray-500">
          No selection
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-white text-gray-900">
      {/* TOP: Heatmap ↔ Visualizer, full width */}
      <main className="flex w-full flex-col gap-6 overflow-y-auto px-6 py-6">
        <section className="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
          {heatmap}
          {viewer}
        </section>

        {/* BOTTOM: Uniprot → PDB → ADMET (세로 스택, ADMET 최하단) */}
        <section className="grid w-full grid-cols-1 gap-6">
          {/* UniProt */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-medium">UniProt</div>
            {selUniprot ? (
              <Uniprot uniprotId={selUniprot} />
            ) : (
              <div className="grid h-32 place-items-center text-xs text-gray-500">
                Select a cell
              </div>
            )}
          </div>

          {/* PDB */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-medium">PDB</div>
            {pdbId ? (
              <PDB pdbId={pdbId} />
            ) : selUniprot ? (
              <div className="grid h-32 place-items-center text-xs text-gray-500">
                No mapped PDB for UniProt <b>{selUniprot}</b>
              </div>
            ) : (
              <div className="grid h-32 place-items-center text-xs text-gray-500">
                Select a cell
              </div>
            )}
          </div>

          {/* ADMET (항상 최하단) */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-medium">ADMET</div>
            {selCidForAdmet ? (
              admet[selCidForAdmet] ? (
                <ADMET
                  cid={selCidForAdmet}
                  smiles={smiles[selCidForAdmet]}
                  data={admet[selCidForAdmet].admet_prediction}
                />
              ) : (
                <div className="grid h-32 place-items-center text-xs text-gray-500">
                  No ADMET prediction for CID: {selCidForAdmet}
                </div>
              )
            ) : (
              <div className="grid h-32 place-items-center text-xs text-gray-500">
                Select a cell
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
