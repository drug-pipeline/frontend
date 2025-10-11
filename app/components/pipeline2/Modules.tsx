"use client";

import React, { useMemo, useState } from "react";
import {
  FiBox,
  FiDatabase,
  FiCpu,
  FiActivity,
  FiLayers,
  FiMap,
  FiEye,
  FiCodesandbox,
  FiChevronDown,
  FiChevronRight,
  FiSearch,
} from "react-icons/fi";

/* =========================
 * 모듈 타입 정의
 * =======================*/
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
  | "molprobity";

export type ModuleSpec = {
  key: ModuleKey;
  title: string;
  category: "Input" | "Simulation" | "Analysis" | "Visualizer";
  Icon: React.ComponentType<any>;
};

/* =========================
 * 모듈 목록
 * =======================*/
export const MODULES: ModuleSpec[] = [
  { key: "compound-input", title: "Compound Input", category: "Input", Icon: FiBox },
  { key: "pdb-input", title: "PDB Input", category: "Input", Icon: FiDatabase },
  { key: "dockmd", title: "DockMD", category: "Simulation", Icon: FiCpu },
  { key: "dpsp", title: "DPSP", category: "Simulation", Icon: FiCpu },
  { key: "dbalp", title: "DBALP", category: "Simulation", Icon: FiCpu },
  { key: "pqrsa", title: "PQRSA", category: "Simulation", Icon: FiCpu },
  { key: "stap", title: "STAP", category: "Simulation", Icon: FiCpu },
  { key: "admet", title: "ADMET", category: "Analysis", Icon: FiActivity },
  { key: "deepkinome", title: "DeepKinome", category: "Analysis", Icon: FiActivity },
  { key: "ppi", title: "PPI", category: "Analysis", Icon: FiActivity },
  { key: "natural", title: "Natural Product", category: "Analysis", Icon: FiActivity },
  { key: "ai-protein-design", title: "AI Protein Design", category: "Analysis", Icon: FiActivity },
  { key: "ppimut", title: "PPI Mutation", category: "Analysis", Icon: FiActivity },
  { key: "visualizer", title: "3D Visualizer", category: "Visualizer", Icon: FiEye },
  { key: "vis-secondary", title: "Secondary Structure", category: "Visualizer", Icon: FiLayers },
  { key: "vis-interaction", title: "Interaction Graph", category: "Visualizer", Icon: FiCodesandbox },
  { key: "distance-map", title: "Distance Map", category: "Visualizer", Icon: FiMap },
  { key: "molprobity", title: "MolProbity", category: "Visualizer", Icon: FiMap },
  { key: "legacy-dockmd-vis", title: "Legacy DockMD Viewer", category: "Visualizer", Icon: FiEye },
];

/* =========================
 * 사이드바 컴포넌트
 * =======================*/
export default function ModuleSidebar({
  modules,
  onCreate,
}: {
  modules: ModuleSpec[];
  onCreate: (spec: ModuleSpec) => void;
}) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, ModuleSpec[]>();
    for (const m of modules) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category)!.push(m);
    }
    return Array.from(map.entries());
  }, [modules]);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredModules = (list: ModuleSpec[]) =>
    query.trim()
      ? list.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
      : list;

  return (
    <aside className="border-r border-zinc-200 bg-zinc-50/60 backdrop-blur-md shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200">
        <div className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
          Modules
        </div>
        <div className="relative mt-2">
          <FiSearch className="absolute left-2 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white/70 pl-8 pr-2 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
      </div>

      {/* Module List */}
      <div className="h-[calc(100vh-90px)] overflow-auto px-4 py-4 space-y-6">
        {grouped.map(([cat, list]) => {
          const isOpen = openCategories[cat] ?? true;
          const visibleList = filteredModules(list);
          if (visibleList.length === 0 && query) return null;

          return (
            <div key={cat}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center justify-between text-[12px] font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-800 transition"
              >
                <span className="flex items-center gap-1">
                  {isOpen ? (
                    <FiChevronDown className="text-zinc-500" />
                  ) : (
                    <FiChevronRight className="text-zinc-500" />
                  )}
                  {cat}
                </span>
              </button>

              {/* Module Items */}
              {isOpen && (
                <div className="mt-2 ml-5 space-y-1.5">
                  {visibleList.map((m) => (
                    <button
                      key={m.key}
                      className="group flex items-center gap-3 w-full rounded-md px-3 py-2 text-left transition hover:bg-zinc-100/80 hover:shadow-sm"
                      onClick={() => onCreate(m)}
                    >
                      <m.Icon className="shrink-0 text-zinc-600 group-hover:text-zinc-800" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Add to canvas
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
