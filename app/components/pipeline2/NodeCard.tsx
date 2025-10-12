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
  FiClock,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { useConnectionHints } from "./ConnectionHintsContext";

/* ===== Shared types ===== */
export type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export type ModuleKey =
  | "pdb-input"
  | "compound-input"
  | "visualizer"
  | "vis-secondary"
  | "distance-map"
  | "admet"
  | "uniprot-info"
  | "pdb-info";

export type NodeData = {
  key: ModuleKey;
  title: string;
  status: NodeStatus;
};

/* ===== Visualizer group ===== */
const VISUALIZER_KEYS: Readonly<ModuleKey[]> = [
  "visualizer",
  "vis-secondary",
  "distance-map",
];

/* ===== Status styles/icons ===== */
const statusStyle = (status: NodeStatus) => {
  switch (status) {
    case "PENDING":
      return { bar: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200", Icon: FiClock, label: "Pending" };
    case "RUNNING":
      return { bar: "bg-blue-50", dot: "bg-blue-500", text: "text-blue-700", ring: "ring-blue-200", Icon: FiActivity, label: "Running" };
    case "SUCCESS":
      return { bar: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", Icon: FiCheckCircle, label: "Success" };
    case "FAILED":
    default:
      return { bar: "bg-rose-50", dot: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200", Icon: FiXCircle, label: "Failed" };
  }
};

/* ===== Icons per module ===== */
const KeyIcon: Record<ModuleKey, React.ComponentType<any>> = {
  "pdb-input": FiPackage,
  "compound-input": FiPackage,
  visualizer: FiEye,
  "vis-secondary": FiEye,
  "distance-map": FiMap,
  admet: FiPackage,
  "uniprot-info": FiInfo,
  "pdb-info": FiInfo,
};

/* ===== Small pill ===== */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
      {children}
    </span>
  );
}

/* ===== Labels ===== */
const KEY_LABEL: Record<ModuleKey, string> = {
  "pdb-input": "PDB Input",
  "compound-input": "Compound Input",
  visualizer: "Visualizer",
  "vis-secondary": "Secondary",
  "distance-map": "Distance Map",
  admet: "ADMET",
  "uniprot-info": "UniProt Info",
  "pdb-info": "PDB Info",
};

/* ===== Lightweight tooltip ===== */
/* ===== Sleek glass tooltip (drop-in replacement) ===== */
function HandleTooltip({
  visible,
  mode,
  toList,
  fromList,
}: {
  visible: boolean;
  mode: "to" | "from" | null;
  toList: ModuleKey[];
  fromList: ModuleKey[];
}) {
  // 마운트/언마운트 대신 트랜지션만 주고 싶다면 display 토글 대신 opacity+scale만 써도 OK
  if (!mode) return null;

  const show = visible && (mode === "to" ? toList.length > 0 : fromList.length > 0);

  return (
    <div
      role="tooltip"
      aria-hidden={!show}
      className={[
        "pointer-events-none absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full",
        "transition-all duration-150 ease-out",
        show ? "opacity-100 scale-100" : "opacity-0 scale-95",
      ].join(" ")}
    >
      <div
        className={[
          // 컨테이너
          "relative rounded-xl border border-zinc-200/70 bg-white/90 backdrop-blur",
          "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/0",
          "px-3 py-2 text-xs text-zinc-700",
          "whitespace-nowrap w-max max-w-none",
          "dark:bg-zinc-900/85 dark:border-zinc-700/60 dark:text-zinc-200",
        ].join(" ")}
      >
        {/* 상단 라벨 */}
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <span
            className={[
              "inline-block h-1.5 w-1.5 rounded-full",
              mode === "to" ? "bg-emerald-500" : "bg-indigo-500",
            ].join(" ")}
          />
          {mode === "to" ? "Can connect to" : "Accepts from"}
        </div>

        {/* 내용 pills */}
        <div className="flex flex-wrap gap-1.5">
          {(mode === "to" ? toList : fromList).map((k) => (
            <span
              key={k}
              className={[
                "inline-flex items-center rounded-full",
                "border border-zinc-200/80 bg-white/70 px-2 py-0.5",
                "text-[11px] text-zinc-700",
                "dark:bg-zinc-800/70 dark:border-zinc-700/70 dark:text-zinc-200",
              ].join(" ")}
            >
              {KEY_LABEL[k]}
            </span>
          ))}
        </div>

        {/* 화살표 */}
        <span
          className={[
            "absolute left-1/2 bottom-[-7px] -translate-x-1/2",
            "h-3 w-3 rotate-45",
            "bg-white/90 border border-zinc-200/70",
            "dark:bg-zinc-900/85 dark:border-zinc-700/60",
          ].join(" ")}
          aria-hidden
        />
      </div>
    </div>
  );
}


/* ===== Node component ===== */
export function NodeCard(props: NodeProps<NodeData>) {
  const { id, data, selected } = props;
  const { title, status, key: moduleKey } = data;
  const s = statusStyle(status);
  const TypeIcon = KeyIcon[moduleKey];

  const isVisualizer = VISUALIZER_KEYS.includes(moduleKey);
  const isAdmet = moduleKey === "admet";

  const hasTargetHandle =
    isVisualizer || isAdmet || moduleKey === "uniprot-info" || moduleKey === "pdb-info";
  const hasSourceHandle = moduleKey === "pdb-input" || moduleKey === "compound-input";

  const base = "group relative rounded-2xl bg-white/90 backdrop-blur shadow-sm ring-1 ring-zinc-200 transition-all";

  // connection hint context
  const { hint, setHint, clearHint, shouldHighlightKey, shouldDimKey } = useConnectionHints();

  // what to show in tooltip for *this* node (only when this node is the origin under hover)
  const isOrigin = hint.originNodeId === id && !!hint.mode;
  // You can inline your rules or pass them via context; to keep this self-contained,
  // compute "to" and "from" lists here mirroring your earlier ALLOWED object.
  const TO_BY_KEY: Record<ModuleKey, ModuleKey[]> = {
    "pdb-input": ["visualizer", "vis-secondary", "distance-map", "pdb-info", "uniprot-info"],
    "compound-input": ["admet"],
    visualizer: [],
    "vis-secondary": [],
    "distance-map": [],
    admet: [],
    "uniprot-info": [],
    "pdb-info": [],
  };
  const FROM_BY_KEY: Record<ModuleKey, ModuleKey[]> = {
    "pdb-input": [],
    "compound-input": [],
    visualizer: ["pdb-input"],
    "vis-secondary": ["pdb-input"],
    "distance-map": ["pdb-input"],
    admet: ["compound-input"],
    "uniprot-info": ["pdb-input"],
    "pdb-info": ["pdb-input"],
  };

  const toList = TO_BY_KEY[moduleKey] ?? [];
  const fromList = FROM_BY_KEY[moduleKey] ?? [];

  // Handle hover to set/clear global hint
  const onEnterSource = () => setHint("to", id, moduleKey);
  const onLeaveSource = () => clearHint();
  const onEnterTarget = () => setHint("from", id, moduleKey);
  const onLeaveTarget = () => clearHint();

  // Dim / highlight logic for *every* node
  const shouldDim = shouldDimKey(moduleKey, id);
  const shouldHi = shouldHighlightKey(moduleKey, id);

  return (
    <div
      className={[
        base,
        selected
          ? "ring-4 ring-indigo-400 shadow-[0_0_0_6px_rgba(99,102,241,0.14)] outline outline-2 outline-indigo-200"
          : "hover:shadow-md",
        hint.mode ? (shouldHi ? "scale-[1.02]" : shouldDim ? "opacity-40" : "") : "",
      ].join(" ")}
      aria-label={`${title} (${s.label})`}
    >
      {/* Tooltip (only on the origin node while handle is hovered) */}
      <HandleTooltip visible={isOrigin} mode={hint.mode} toList={toList} fromList={fromList} />

      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className={`!w-3 !h-3 !bg-zinc-600 border-2 border-white ${selected ? "shadow-[0_0_0_2px_rgba(99,102,241,0.5)]" : ""}`}
          onMouseEnter={onEnterTarget}
          onMouseLeave={onLeaveTarget}
        />
      )}
      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className={`!w-3 !h-3 !bg-zinc-600 border-2 border-white ${selected ? "shadow-[0_0_0_2px_rgba(99,102,241,0.5)]" : ""}`}
          onMouseEnter={onEnterSource}
          onMouseLeave={onLeaveSource}
        />
      )}

      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-2xl ${s.bar}`}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <div className={`flex items-center gap-1.5 min-w-0 ${s.text}`}>
          <s.Icon className="shrink-0" aria-hidden />
          <div className="truncate text-sm font-semibold leading-tight text-zinc-900">{title}</div>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-600">
        <TypeIcon className="shrink-0" />
        <span className="truncate">{KEY_LABEL[moduleKey]}</span>
      </div>
    </div>
  );
}

/* ===== nodeTypes ===== */
export const nodeTypes: NodeTypes = { card: NodeCard };
