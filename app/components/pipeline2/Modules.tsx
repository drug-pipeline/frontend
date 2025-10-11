"use client";

import React, { useMemo } from "react";
import { FiPackage, FiEye, FiMap, FiInfo } from "react-icons/fi";

/* =========================
 * 모듈 타입 정의
 * =======================*/
export type ModuleKey =
  | "pdb-input"
  | "compound-input"
  | "visualizer"
  | "distance-map"
  | "admet"
  | "uniprot-info"
  | "pdb-info";

export type ModuleSpec = {
  key: ModuleKey;
  title: string;
  category: "Input" | "Visualizer" | "Analysis" | "Info";
  Icon: React.ComponentType<any>;
  tint: string; // tailwind bg-*
};

/* =========================
 * 모듈 목록
 * =======================*/
export const MODULES: ModuleSpec[] = [
  { key: "pdb-input", title: "PDB Input", category: "Input", Icon: FiPackage, tint: "bg-emerald-50" },
  { key: "compound-input", title: "Compound Input", category: "Input", Icon: FiPackage, tint: "bg-sky-50" },
  { key: "visualizer", title: "Visualizer (NGL)", category: "Visualizer", Icon: FiEye, tint: "bg-blue-50" },
  { key: "distance-map", title: "Distance Map", category: "Visualizer", Icon: FiMap, tint: "bg-indigo-50" },
  { key: "admet", title: "ADMET", category: "Analysis", Icon: FiPackage, tint: "bg-orange-50" },
  { key: "uniprot-info", title: "UniProt Info", category: "Info", Icon: FiInfo, tint: "bg-amber-50" },
  { key: "pdb-info", title: "PDB Info", category: "Info", Icon: FiInfo, tint: "bg-rose-50" },
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
  const grouped = useMemo(() => {
    const m = new Map<string, ModuleSpec[]>();
    for (const spec of modules) {
      if (!m.has(spec.category)) m.set(spec.category, []);
      m.get(spec.category)!.push(spec);
    }
    return Array.from(m.entries());
  }, [modules]);

  return (
    <aside className="border-r border-zinc-200 bg-white">
      <div className="px-4 py-3">
        <div className="text-xs font-semibold text-zinc-600">Modules</div>
      </div>
      <div className="h-[calc(100vh-56px)] overflow-auto p-3 space-y-4">
        {grouped.map(([cat, list]) => (
          <div key={cat} className="space-y-2">
            <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {cat}
            </div>
            <div className="grid gap-2">
              {list.map((m) => (
                <button
                  key={m.key}
                  className={`flex items-center gap-2 rounded-xl ${m.tint} px-3 py-2 text-left ring-1 ring-zinc-200 transition hover:shadow-sm`}
                  onClick={() => onCreate(m)}
                >
                  <m.Icon className="shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">{m.title}</div>
                    <div className="text-[11px] text-zinc-500">Add to canvas</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
