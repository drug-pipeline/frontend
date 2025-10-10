"use client";

import React, { useMemo } from "react";

/** 목록 전용 모듈 타입 (page.tsx의 ModuleSpec 형태만 사용) */
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
  color: string;   // tailwind bg-* class (버튼 배경 라벨용)
  emoji: string;   // 아이콘 이모지
};

type Props = {
  modules: ModuleSpec[];
  /** 리스트에서 항목 클릭 시 캔버스에 노드 생성 */
  onCreate: (spec: ModuleSpec) => void;
};

export default function ModuleList({ modules, onCreate }: Props) {
  // 카테고리별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<ModuleSpec["category"], ModuleSpec[]>();
    for (const m of modules) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return map;
  }, [modules]);

  return (
    <aside className="border-r border-zinc-200 p-3 space-y-4">
      <div className="font-semibold tracking-tight text-lg">Modules</div>

      {[..."Input,Visualizer,Analysis,Info".split(",")].map((cat) => {
        const items = grouped.get(cat as ModuleSpec["category"]) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={cat} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {cat}
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {items.map((m) => (
                <button
                  key={m.key}
                  onClick={() => onCreate(m)}
                className="w-full flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm hover:bg-zinc-50"
                >
                  <span className="text-base">{m.emoji}</span>
                  <span className="truncate">{m.title}</span>
                  <span
                    className={[
                      "ml-auto text-[10px] font-semibold rounded-md px-1.5 py-0.5",
                      m.category === "Input"
                        ? "bg-emerald-100 text-emerald-900"
                        : m.category === "Visualizer"
                        ? "bg-blue-100 text-blue-900"
                        : m.category === "Analysis"
                        ? "bg-orange-100 text-orange-900"
                        : "bg-zinc-100 text-zinc-800",
                    ].join(" ")}
                  >
                    {m.category}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-zinc-500">
        클릭 시 캔버스에 <b>일반 노드</b>만 생성됩니다. 노드의 <b>Open</b>을 눌러 모듈을 엽니다.
      </p>
    </aside>
  );
}
