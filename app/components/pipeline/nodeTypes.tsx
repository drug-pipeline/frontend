"use client";

import React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { usePipeline } from "./usePipeline";
import type { ModuleKey } from "./ModuleRegistry";

type NodeData = {
  key: ModuleKey;
  title: string;
  color?: string;
};

const VISUALIZER_KEYS: Readonly<ModuleKey[]> = [
  "vis-secondary",
  "vis-interaction",
  "visualizer",
  "distance-map",
  "molprobity", // ✅ 추가
];

const TARGET_ACCEPT_KEYS = new Set<ModuleKey>([
  ...VISUALIZER_KEYS,
  "admet", // ✅ ADMET도 타깃으로 연결 받음
]);

function isPdbInput(key: ModuleKey): boolean {
  return key === "pdb-input";
}
function isVisualizer(key: ModuleKey): boolean {
  return VISUALIZER_KEYS.includes(key);
}

function isCompoundInput(key: ModuleKey): boolean {
  return key === "compound-input";
}
function hasTargetHandle(key: ModuleKey): boolean {
  return TARGET_ACCEPT_KEYS.has(key);
}

export function NodeCard({ data, selected }: NodeProps<NodeData>) {
  const { openPanel } = usePipeline();
  const { key, title, color } = data;

  const ring = selected ? "ring-2 ring-indigo-300" : "ring-0"; // ✅ 기본 회색 ring 제거
  const bgGrad =
    "bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900/60 dark:to-zinc-900/40";
  const chip = isPdbInput(key)
    ? "bg-emerald-100 text-emerald-900"
    : isVisualizer(key)
    ? "bg-blue-100 text-blue-900"
    : "bg-zinc-100 text-zinc-800";

  return (
    <div
      className={`rounded-2xl shadow-sm ${bgGrad} ${ring} transition-all hover:shadow-md`}
    >
      {/* Handles */}
      {hasTargetHandle(key) && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-3 !h-3 !bg-blue-500 border-2 border-white"
        />
      )}

      {(isPdbInput(key) || isCompoundInput(key)) && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-3 !h-3 !bg-emerald-500 border-2 border-white"
        />
      )}

      <div
        className={`px-3 py-2 flex items-center justify-between gap-2 ${
          color ?? ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${chip}`}
            title={key}
          >
            {isPdbInput(key) ? "PDB" : isVisualizer(key) ? "VIS" : "MOD"}
          </span>
          <div className="text-sm font-semibold leading-tight truncate">
            {title}
          </div>
        </div>
        <button
          type="button"
          onClick={() => openPanel(key)}
          className="text-xs rounded-lg border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
          aria-label={`Open ${title}`}
          title={`Open ${title}`}
        >
          Open
        </button>
      </div>
    </div>
  );
}
