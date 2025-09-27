"use client";

import React from "react";
import { useViewer, type ViewerState } from "./ViewerContext";

// ⚠️ 정적 임포트 (동적 import 제거 & 경로 수정)
// 현재 파일이 app/components/pipeline/ModuleRegistry.tsx 이므로
// 상위 폴더의 컴포넌트들은 "../" 로 접근
import DeepKinomePanel from "../DeepKinomePanel";
import InteractionPanel from "../InteractionPanel";
import SecondaryStructurePanel from "../SecondaryStructurePanel";
import NglWebapp from "../NglWebapp";
import DistanceMapPanel from "../DistanceMapPanel";

export type ModuleKey =
  | "compound-input"
  | "pdb-input"
  | "dockmd"
  | "dpsp"
  | "dbalp"
  | "pqrsa"
  | "stap"
  | "admet"
  | "deepkinome"
  | "ppi"
  | "natural"
  | "ai-protein-design"
  | "ppimut"
  | "legacy-dockmd-vis"
  | "vis-secondary"
  | "vis-interaction"
  | "visualizer"
  | "distance-map"
  | "molprobity"; // ✅ 추가

export type ModuleSpec = {
  key: ModuleKey;
  title: string;
  color: string; // Tailwind bg-* class
  description?: string;
  placeholder?: boolean;
  renderPanel?: () => React.ReactNode;
};

/**
 * Module 레지스트리
 * - 요구사항: Secondary, NglWebapp, DistanceMapPanel 은 viewer를 props로 전달
 * - 구현: 상위에서 받은 viewer를 renderPanel 클로저가 캡처하여 전달
 */
export function useModuleRegistry(viewer?: ViewerState): ModuleSpec[] {
  // ViewerContext가 세팅되어 있는지 보장 (값은 사용 안 해도 무방)
  // 외부에서 viewer를 안 넘겼다면 context에서 가져와서 사용
  const ctxViewer = useViewer();
  const v: ViewerState = viewer ?? ctxViewer;

  return [
    {
      key: "compound-input",
      title: "Compound Input",
      color: "bg-sky-100",
      placeholder: true,
      description: "SMILES/SDF 업로드(자리표시)",
    },
    {
      key: "pdb-input",
      title: "PDB Input",
      color: "bg-emerald-100",
      description: "PDB id 또는 파일 업로드",
      renderPanel: () => <PdbInputPanel />,
    },
    { key: "dockmd", title: "Dockmd 도킹 md", color: "bg-amber-100", placeholder: true },
    { key: "dpsp", title: "Dpsp pocket-suggest", color: "bg-indigo-100", placeholder: true },
    { key: "dbalp", title: "Dbalp protein DB", color: "bg-fuchsia-100", placeholder: true },
    { key: "pqrsa", title: "Pqrsa homology", color: "bg-rose-100", placeholder: true },
    { key: "stap", title: "Stap database", color: "bg-lime-100", placeholder: true },
    { key: "admet", title: "Admet", color: "bg-orange-100", placeholder: true },

    { key: "deepkinome", title: "DeepKinome", color: "bg-teal-100", renderPanel: () => <DeepKinomePanel /> },

    { key: "ppi", title: "Ppi module", color: "bg-cyan-100", placeholder: true },
    { key: "natural", title: "천연물 데이터베이스", color: "bg-emerald-100", placeholder: true },
    { key: "ai-protein-design", title: "인공지능단백질 디자인", color: "bg-violet-100", placeholder: true },
    { key: "ppimut", title: "Ppimut", color: "bg-yellow-100", placeholder: true },
    { key: "legacy-dockmd-vis", title: "Legacy: dock md visualizer", color: "bg-gray-100", placeholder: true },

    // ✅ 요구사항 반영: viewer를 props로 전달
    { key: "vis-secondary", title: "Visualizer – Secondary", color: "bg-blue-100", renderPanel: () => <SecondaryStructurePanel viewer={v} /> },
    { key: "vis-interaction", title: "Visualizer – Interaction", color: "bg-blue-100", renderPanel: () => <InteractionPanel /> },
    { key: "visualizer", title: "Visualizer (NGL)", color: "bg-blue-100", renderPanel: () => <NglWebapp viewer={v} /> },
    { key: "distance-map", title: "Distance Map", color: "bg-stone-100", renderPanel: () => <DistanceMapPanel viewer={v} /> },
    { key: "molprobity", title: "MolProbity", color: "bg-purple-100", placeholder: true },
  ];
}

/** 간단한 PDB 입력 패널: viewer 컨텍스트에 값 반영 */
function PdbInputPanel() {
  const { pdbName, setPdbName } = useViewer();
  const [value, setValue] = React.useState<string>(pdbName ?? "1CRN");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">PDB ID</label>
      <input
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="e.g., 1CRN"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg bg-black text-white px-3 py-1.5 text-sm"
          onClick={() => setPdbName(value.trim() || null)}
        >
          Apply to Viewer
        </button>
        <span className="text-xs text-zinc-500">현재: {pdbName ?? "(none)"}</span>
      </div>
      <p className="text-xs text-zinc-500">이 값은 Distance Map 등 연결된 모듈에 공유됩니다.</p>
    </div>
  );
}
