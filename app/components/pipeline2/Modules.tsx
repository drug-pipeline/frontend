"use client";

import React, { useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiSearch } from "react-icons/fi";

/** ✅ Registry를 직접 import하지 않고, 헬퍼만 사용 */
import {
  listByCategory,  // 카테고리 그룹 묶음 제공
  getSpec,         // 단일 항목 조회 (title, Icon, category 포함)
  type NodeType,
} from "@/app/components/pipeline2/NodeRegistry";

/* =========================
 * 타입: ModuleKey = NodeType
 * =======================*/
export type ModuleKey = NodeType;

/** 사이드바가 외부로 전달받는 최소 스펙 (key만 보유) */
export type ModuleSpec = {
  key: ModuleKey;
};

/* =========================
 * 사이드바에 노출할 모듈 목록
 * - REGISTRY를 직접 쓰지 않고 listByCategory()로 모두 수집
 * - 필요하면 여기서 필터링/정렬 로직 추가
 * =======================*/
function buildAllModulesFromRegistry(): ModuleSpec[] {
  const grouped = listByCategory(); // { Input: RegistryItem[], Visualizer: ..., Analysis: ... }
  const items = [...(grouped.Input ?? []), ...(grouped.Visualizer ?? []), ...(grouped.Analysis ?? [])];

  // 타이틀 기준 정렬(선택)
  items.sort((a, b) => a.title.localeCompare(b.title));

  return items.map((it) => ({ key: it.type }));
}

/** 외부에서 재사용 가능하도록 export */
export const MODULES: ModuleSpec[] = buildAllModulesFromRegistry();

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

  /** 카테고리별 그룹핑 (헬퍼 listByCategory 사용) */
  const grouped = useMemo(() => {
    // modules로 전달된 key만 남기고, 카테고리로 재그룹
    const byCat = new Map<string, ModuleSpec[]>();

    for (const m of modules) {
      const spec = getSpec(m.key);        // title, Icon, category 등 조회
      const cat = spec.category;          // "Input" | "Visualizer" | "Analysis"
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(m);
    }

    // 각 카테고리 내부도 title 기준 정렬
    for (const [cat, list] of byCat.entries()) {
      list.sort((a, b) => getSpec(a.key).title.localeCompare(getSpec(b.key).title));
    }

    // 카테고리 섹션 순서 (원하면 변경 가능)
    const order = ["Input", "Visualizer", "Analysis"];
    return Array.from(byCat.entries()).sort(
      ([a], [b]) => order.indexOf(a) - order.indexOf(b)
    );
  }, [modules]);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  /** 검색: title 기준 (getSpec로 조회) */
  const filterByQuery = (list: ModuleSpec[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => getSpec(m.key).title.toLowerCase().includes(q));
  };

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
          const visible = filterByQuery(list);
          if (visible.length === 0 && query) return null;

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

              {/* Items */}
              {isOpen && (
                <div className="mt-2 ml-5 space-y-1.5">
                  {visible.map((m) => {
                    const spec = getSpec(m.key);
                    const Icon = spec.Icon;
                    return (
                      <button
                        key={m.key}
                        className="group flex items-center gap-3 w-full rounded-md px-3 py-2 text-left transition hover:bg-zinc-100/80 hover:shadow-sm"
                        onClick={() => onCreate(m)}
                      >
                        <Icon className="shrink-0 text-zinc-600 group-hover:text-zinc-800" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {spec.title}
                          </div>
                          <div className="text-[11px] text-zinc-500">Add to canvas</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ============ 사용 예 =============
   import ModuleSidebar, { MODULES } from "./Modules";
   <ModuleSidebar modules={MODULES} onCreate={createNode} />
 * ==================================*/
