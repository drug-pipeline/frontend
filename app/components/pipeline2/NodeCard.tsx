"use client";

import React from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type NodeTypes,
} from "reactflow";
import {
  FiPackage,
  FiEye,
  FiMap,
  FiInfo,
  FiClock,     // PENDING
  FiActivity,  // RUNNING
  FiCheckCircle, // SUCCESS
  FiXCircle,   // FAILED
} from "react-icons/fi";

/* ===== 공유 타입 ===== */
export type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

// Modules.tsx의 ModuleKey를 재사용 (타입만 import)
export type ModuleKey =
  | "pdb-input"
  | "compound-input"
  | "visualizer"
  | "distance-map"
  | "admet"
  | "uniprot-info"
  | "pdb-info";

export type NodeData = {
  key: ModuleKey;
  title: string;
  status: NodeStatus;
};

/* ===== 시각화 규칙 ===== */
const VISUALIZER_KEYS: Readonly<ModuleKey[]> = ["visualizer", "distance-map"];

/* ===== 상태별 스타일/아이콘 ===== */
const statusStyle = (status: NodeStatus) => {
  switch (status) {
    case "PENDING":
      return {
        bar: "bg-amber-50",
        dot: "bg-amber-400",
        text: "text-amber-700",
        ring: "ring-amber-200",
        Icon: FiClock,
        label: "Pending",
      };
    case "RUNNING":
      return {
        bar: "bg-blue-50",
        dot: "bg-blue-500",
        text: "text-blue-700",
        ring: "ring-blue-200",
        Icon: FiActivity,
        label: "Running",
      };
    case "SUCCESS":
      return {
        bar: "bg-emerald-50",
        dot: "bg-emerald-500",
        text: "text-emerald-700",
        ring: "ring-emerald-200",
        Icon: FiCheckCircle,
        label: "Success",
      };
    case "FAILED":
    default:
      return {
        bar: "bg-rose-50",
        dot: "bg-rose-500",
        text: "text-rose-700",
        ring: "ring-rose-200",
        Icon: FiXCircle,
        label: "Failed",
      };
  }
};

/* ===== 아이콘 맵 ===== */
const KeyIcon: Record<ModuleKey, React.ComponentType<any>> = {
  "pdb-input": FiPackage,
  "compound-input": FiPackage,
  visualizer: FiEye,
  "distance-map": FiMap,
  admet: FiPackage,
  "uniprot-info": FiInfo,
  "pdb-info": FiInfo,
};

/* ===== Node 컴포넌트 ===== */
export function NodeCard({ data, selected }: NodeProps<NodeData>) {
  const { title, status } = data;
  const s = statusStyle(status);
  const TypeIcon = KeyIcon[data.key];

  const isVisualizer = VISUALIZER_KEYS.includes(data.key);
  const isAdmet = data.key === "admet";
  const hasTargetHandle =
    isVisualizer || isAdmet || data.key === "uniprot-info" || data.key === "pdb-info";
  const hasSourceHandle = data.key === "pdb-input" || data.key === "compound-input";

  const base =
    "group rounded-2xl bg-white/90 backdrop-blur shadow-sm ring-1 ring-zinc-200 transition-all";

  return (
    <div
      className={[
        base,
        selected
          ? "ring-4 ring-indigo-400 shadow-[0_0_0_6px_rgba(99,102,241,0.14)] outline outline-2 outline-indigo-200"
          : "hover:shadow-md",
      ].join(" ")}
    >
      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className={`!w-3 !h-3 !bg-zinc-600 border-2 border-white ${selected ? "shadow-[0_0_0_2px_rgba(99,102,241,0.5)]" : ""}`}
        />
      )}
      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className={`!w-3 !h-3 !bg-zinc-600 border-2 border-white ${selected ? "shadow-[0_0_0_2px_rgba(99,102,241,0.5)]" : ""}`}
        />
      )}

      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-2xl ${s.bar}`}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <div className={`flex items-center gap-1.5 min-w-0 ${s.text}`}>
          <s.Icon className="shrink-0" aria-hidden />
          <div className="truncate text-sm font-semibold leading-tight text-zinc-900">
            {title}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-600">
        <TypeIcon className="shrink-0" />
        <span className="truncate">Drag to connect.</span>
      </div>
    </div>
  );
}

/* ===== React Flow nodeTypes ===== */
export const nodeTypes: NodeTypes = { card: NodeCard };
