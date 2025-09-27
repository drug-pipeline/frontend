"use client";

import React from "react";
import { usePipeline } from "./usePipeline";
import { useModuleRegistry } from "./ModuleRegistry";
import { useViewer } from "./ViewerContext";
import {
  Beaker,
  Atom,
  FileInput,
  Eye,
  SquareFunction as Distance,
  Component as VisualIcon,
  Search,
  X,
  ShieldCheck,     // ✅ MolProbity 아이콘
  FlaskConical,    // ✅ Compound Input 아이콘
} from "lucide-react";

type IconKey =
  | "pdb-input"
  | "compound-input"   // ✅ 추가
  | "deepkinome"
  | "vis-secondary"
  | "vis-interaction"
  | "visualizer"
  | "distance-map"
  | "molprobity"       // ✅ 추가
  | "default";

const ICON_MAP: Record<IconKey, React.ReactNode> = {
  "pdb-input": <FileInput className="h-4 w-4" />,
  "compound-input": <FlaskConical className="h-4 w-4" />, // ✅
  deepkinome: <Beaker className="h-4 w-4" />,
  "vis-secondary": <VisualIcon className="h-4 w-4" />,
  "vis-interaction": <Atom className="h-4 w-4" />,
  visualizer: <Eye className="h-4 w-4" />,
  "distance-map": <Distance className="h-4 w-4" />,
  molprobity: <ShieldCheck className="h-4 w-4" />,         // ✅
  default: <Beaker className="h-4 w-4" />,
};

const VIZ_KEYS = new Set([
  "vis-secondary",
  "vis-interaction",
  "visualizer",
  "distance-map",
  "molprobity", // ✅ 추가
]);

function iconFor(key: string): React.ReactNode {
  return (ICON_MAP as Record<string, React.ReactNode>)[key] ?? ICON_MAP.default;
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const mid = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-200 text-zinc-900 rounded px-[2px]">{mid}</mark>
      {after}
    </>
  );
}

export function ModuleSidebar() {
  const { createNode } = usePipeline();
  const viewer = useViewer();
  const modules = useModuleRegistry(viewer);

  // 검색 상태
  const [q, setQ] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // "/" 단축키로 포커스
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 필터링
  const normalized = q.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      modules.filter((m) => {
        if (!normalized) return true;
        return (
          m.title.toLowerCase().includes(normalized) ||
          m.key.toLowerCase().includes(normalized)
        );
      }),
    [modules, normalized]
  );

  // 섹션 분류
  const inputModules = filtered.filter((m) =>
    ["pdb-input", "compound-input"].includes(m.key)
  );
  const vizModules = filtered.filter((m) => VIZ_KEYS.has(m.key));
  const others = filtered.filter(
    (m) => m.key !== "pdb-input" && !VIZ_KEYS.has(m.key)
  );

  // Enter로 첫 결과 생성
  const onKeyDownSearch: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      const first =
        inputModules[0] ?? vizModules[0] ?? others[0] ?? undefined;
      if (first) createNode(first.key);
    }
  };

  return (
    <div className="space-y-6">
      {/* 검색창 */}
      <div className="relative">
        <label htmlFor="module-search" className="sr-only">
          Search modules
        </label>
        <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            id="module-search"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDownSearch}
            className="ml-2 w-full bg-transparent py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            placeholder="Search modules…  (Press / to focus, Enter to add)"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              className="rounded p-1 hover:bg-zinc-100"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* PDB 입력 */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Input
        </h3>
        <div className="space-y-1">
          {inputModules.length === 0 && normalized && (
            <div className="text-xs text-zinc-400 px-1.5">No matches</div>
          )}
          {inputModules.map((m) => (
            <button
              key={m.key}
              onClick={() => createNode(m.key)}
              className="w-full flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm hover:bg-zinc-50"
            >
              <span className="shrink-0">{iconFor(m.key)}</span>
              <span className="truncate">
                {highlight(m.title, q)}{" "}
                <span className="text-[10px] text-zinc-400">({m.key})</span>
              </span>
              <span className="ml-auto text-[10px] font-semibold rounded-md px-1.5 py-0.5 bg-emerald-100 text-emerald-900">
                INPUT
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Visualizers */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Visualizers
        </h3>
        <div className="grid grid-cols-1 gap-1">
          {vizModules.length === 0 && normalized && (
            <div className="text-xs text-zinc-400 px-1.5">No matches</div>
          )}
          {vizModules.map((m) => (
            <button
              key={m.key}
              onClick={() => createNode(m.key)}
              className="w-full flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm hover:bg-zinc-50"
            >
              <span className="shrink-0">{iconFor(m.key)}</span>
              <span className="truncate">
                {highlight(m.title, q)}{" "}
                <span className="text-[10px] text-zinc-400">({m.key})</span>
              </span>
              <span className="ml-auto text-[10px] font-semibold rounded-md px-1.5 py-0.5 bg-blue-100 text-blue-900">
                VIS
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Others */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Modules
        </h3>
        <div className="grid grid-cols-1 gap-1">
          {others.length === 0 && normalized && (
            <div className="text-xs text-zinc-400 px-1.5">No matches</div>
          )}
          {others.map((m) => (
            <button
              key={m.key}
              onClick={() => createNode(m.key)}
              className="w-full flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm hover:bg-zinc-50"
            >
              <span className="shrink-0">{iconFor(m.key)}</span>
              <span className="truncate">
                {highlight(m.title, q)}{" "}
                <span className="text-[10px] text-zinc-400">({m.key})</span>
              </span>
              <span className="ml-auto text-[10px] font-semibold rounded-md px-1.5 py-0.5 bg-zinc-100 text-zinc-800">
                MOD
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
