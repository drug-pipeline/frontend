"use client";

import React, { useEffect, useRef, useState } from "react";
import * as NGL from "ngl";

/* -----------------------------
   Minimal NGL type facades (strict, no any)
--------------------------------*/
type NglVec2 = { x: number; y: number };

type NglAtom = {
  qualifiedName(): string;
  element: string;
  resname: string;
  resno: number;
  chainname: string;
  x: number;
  y: number;
  z: number;
};

type NglPickingProxy = {
  atom?: NglAtom;
  bond?: unknown;
  closestBondAtom?: NglAtom;
  canvasPosition: NglVec2;
};

type NglSignal<T> = {
  add(cb: (v: T) => void): void;
  remove(cb: (v: T) => void): void;
};

type NglSignals = {
  hovered: NglSignal<NglPickingProxy | undefined>;
};

type NglViewer = {
  container: HTMLElement;
};

type NglStructureComponent = {
  addRepresentation(
    name: "surface" | "cartoon" | "ball+stick",
    params?: Record<string, string | number | boolean | undefined>
  ): void;
  autoView(): void;
};

type NglStage = {
  viewer: NglViewer;
  signals: NglSignals;
  setParameters(params: { tooltip?: boolean; backgroundColor?: string }): void;
  handleResize(): void;
  removeAllComponents(): void;
  loadFile(
    url: string,
    opts: { ext: "pdb"; defaultRepresentation: boolean }
  ): Promise<NglStructureComponent>;
};

type NglModule = {
  Stage: new (el: HTMLElement, params?: { backgroundColor?: string }) => NglStage;
};

/* -----------------------------
   Component props
--------------------------------*/
type NGLViewerProps = {
  uniprotId: string;
  cid?: string;
  taskId?: string;
};

type VisualizerProps = NGLViewerProps;

/* -----------------------------
   Component
--------------------------------*/
const NGLViewer: React.FC<NGLViewerProps> = ({ uniprotId, cid, taskId }) => {
  // SIMPLE style API base
  const API_BASE = "http://34.61.162.19/api/deepkinome";

  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<NglStage | null>(null);

  const [renderMode, setRenderMode] = useState<"surface" | "cartoon">("surface");
  const [showPocket, setShowPocket] = useState<boolean>(false);
  const [pocketResidues, setPocketResidues] = useState<number[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  const downloadPDB = async (): Promise<void> => {
    try {
      const qs = new URLSearchParams();
      qs.set("uniprotId", uniprotId);
      if (cid) qs.set("cid", cid);
      if (taskId) qs.set("taskId", taskId);

      // CHANGED: /api 제거
      const response = await fetch(`${API_BASE}/visualizer/pdb/download?${qs.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to fetch PDB file");
      const blob = await response.blob();

      const fileName = cid ? `${uniprotId}_${cid}_download.pdb` : `${uniprotId}_download.pdb`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("[Error] Downloading PDB file failed:", error);
    }
  };

  // Pocket residues
  useEffect(() => {
    if (!uniprotId) return;

    const fetchPocketResidues = async (): Promise<void> => {
      try {
        // CHANGED: /api 제거
        const response = await fetch(`${API_BASE}/pocket?id=${encodeURIComponent(uniprotId)}`, {
          cache: "no-store",
        });
        const data: { residues: number[]; error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch pocket data");
        }
        setPocketResidues(Array.isArray(data.residues) ? data.residues : []);
      } catch (error) {
        console.error("Error fetching pocket residues:", error);
      }
    };

    void fetchPocketResidues();
  }, [uniprotId, API_BASE]);

  // NGL Stage 생성 및 파일 로드
  useEffect(() => {
    if (!stageHostRef.current) return;

    if (!stageRef.current) {
      const ngl = (NGL as unknown as NglModule);
      stageRef.current = new ngl.Stage(stageHostRef.current, { backgroundColor: "white" });
      stageRef.current.setParameters({ tooltip: false });
    }
    const stage = stageRef.current;

    const handleResize = (): void => stage.handleResize();
    window.addEventListener("resize", handleResize, false);

    stage.removeAllComponents();

    // Tooltip
    const tooltip = document.createElement("div");
    Object.assign(tooltip.style, {
      display: "none",
      position: "absolute",
      zIndex: "10",
      pointerEvents: "none",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      color: "lightgrey",
      padding: "0.5em",
      fontFamily: "sans-serif",
      borderRadius: "4px",
    } as CSSStyleDeclaration);
    stage.viewer.container.appendChild(tooltip);

    const onHovered = (pickingProxy?: NglPickingProxy): void => {
      if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
        const atom = pickingProxy.atom ?? pickingProxy.closestBondAtom;
        if (!atom) {
          tooltip.style.display = "none";
          return;
        }
        const cp = pickingProxy.canvasPosition;
        const rect = stage.viewer.container.getBoundingClientRect();

        tooltip.innerHTML = `
          <strong>ATOM:</strong> ${atom.qualifiedName()}<br />
          <strong>Element:</strong> ${atom.element}<br />
          <strong>Residue:</strong> ${atom.resname} ${atom.resno}<br />
          <strong>Chain:</strong> ${atom.chainname}<br />
          <strong>Coordinates:</strong> (${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})
        `;

        tooltip.style.top = `${rect.top + (rect.height - cp.y) + 5}px`;
        tooltip.style.left = `${rect.left + cp.x + 5}px`;
        tooltip.style.display = "block";
      } else {
        tooltip.style.display = "none";
      }
    };

    stage.signals.hovered.add(onHovered);

    const pocketSelection =
      pocketResidues.length > 0 ? pocketResidues.map((resno) => `${resno}`).join(" or ") : "";

    // CHANGED: /api 제거
    const targetUrl =
      `${API_BASE}/visualizer/pdb/target?uniprotId=${encodeURIComponent(uniprotId)}` +
      (cid ? `&cid=${encodeURIComponent(cid)}` : "") +
      (taskId ? `&taskId=${encodeURIComponent(taskId)}` : "");

    const lowestUrl =
      `${API_BASE}/visualizer/pdb/lowest?uniprotId=${encodeURIComponent(uniprotId)}` +
      (cid ? `&cid=${encodeURIComponent(cid)}` : "") +
      (taskId ? `&taskId=${encodeURIComponent(taskId)}` : "");

    let disposed = false;
    let timerId: number | null = null;

    async function loadTarget(): Promise<void> {
      try {
        const resp = await fetch(targetUrl, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);

        const loadedTarget = await stage.loadFile(url, { ext: "pdb", defaultRepresentation: false });
        URL.revokeObjectURL(url);
        if (disposed) return;

        if (renderMode === "surface") {
          if (showPocket && pocketSelection) {
            loadedTarget.addRepresentation("surface", {
              surfaceType: "av",
              probeRadius: 1.4,
              color: "white",
              sele: `not (${pocketSelection})`,
            });
            loadedTarget.addRepresentation("surface", {
              surfaceType: "av",
              probeRadius: 1.4,
              color: "green",
              sele: pocketSelection,
            });
          } else {
            loadedTarget.addRepresentation("surface", {
              surfaceType: "av",
              probeRadius: 1.4,
              color: "white",
            });
          }
        } else {
          loadedTarget.addRepresentation("cartoon", { color: "white" });
          if (showPocket && pocketSelection) {
            loadedTarget.addRepresentation("cartoon", { color: "green", sele: pocketSelection });
          }
        }

        loadedTarget.autoView();
      } catch (e) {
        console.error("target.pdb 파일 로드 중 오류:", e);
      }
    }

    async function loadLowest(): Promise<void> {
      try {
        const resp = await fetch(lowestUrl, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);

        const loadedLig = await stage.loadFile(url, { ext: "pdb", defaultRepresentation: false });
        URL.revokeObjectURL(url);
        if (disposed) return;

        if (renderMode === "cartoon") {
          loadedLig.addRepresentation("ball+stick", {});
        } else {
          loadedLig.addRepresentation("surface", {
            surfaceType: "av",
            probeRadius: 1.4,
            colorScheme: "element",
          });
        }

        if (isInitialLoad) {
          timerId = window.setTimeout(() => {
            setShowPocket(true);
            setIsInitialLoad(false);
          }, 500);
        }
      } catch (e) {
        console.error("lowest.pdb 파일 로드 중 오류:", e);
      }
    }

    (async () => {
      await loadTarget();
      await loadLowest();
    })();

    return () => {
      disposed = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
      stage.removeAllComponents();
      stage.signals.hovered.remove(onHovered);
      tooltip.remove();
      window.removeEventListener("resize", handleResize, false);
    };
  // pocketResidues 등 상태가 변할 때 재로딩
  }, [uniprotId, cid, taskId, renderMode, showPocket, pocketResidues, isInitialLoad, API_BASE]);

  return (
    <div>
      <div className="mt-4 flex space-x-4 items-center overflow-visible">
        <div>
          <label htmlFor="renderMode" className="mr-2 font-bold">
            Render Mode:
          </label>
          <select
            id="renderMode"
            value={renderMode}
            onChange={(e) => setRenderMode(e.target.value as "surface" | "cartoon")}
            className="border p-2 rounded-md"
          >
            <option value="surface">Surface</option>
            <option value="cartoon">Cartoon</option>
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showPocket"
            checked={showPocket}
            onChange={(e) => setShowPocket(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showPocket" className="font-bold">
            Show Pocket
          </label>
        </div>
        <button
          onClick={downloadPDB}
          className="py-2 px-4 bg-theme-main text-white rounded-md hover:bg-theme-after"
        >
          Download PDB
        </button>
      </div>
      <div ref={stageHostRef} className="w-full h-[50vh] md:h-[60vh] lg:h-[65vh] bg-white" />
    </div>
  );
};

const Visualizer: React.FC<VisualizerProps> = ({ uniprotId, cid, taskId }) => {
  const viewerKey = `${uniprotId}-${cid ?? ""}-${taskId ?? ""}`;
  return (
    <div className="flex flex-col items-center">
      <div className="w-full p-4">
        <NGLViewer key={viewerKey} uniprotId={uniprotId} cid={cid} taskId={taskId} />
      </div>
    </div>
  );
};

export default Visualizer;
