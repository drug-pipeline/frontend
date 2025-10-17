// app/components/pipeline2/NodeCard.tsx
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
import {
  type NodeType,
  getSpec
} from "./NodeRegistry";

/* ===== Shared types ===== */
export type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

/**
 * ⬇️ 1단계 핵심: ModuleKey를 NodeType으로 통합
 * - data.key는 이제 "PDB" | "COMPOUND" | ... 같은 NodeType 문자열 그대로 사용
 */
export type ModuleKey = NodeType;


export type NodeData = {
  key: ModuleKey;   // ← NodeType 그대로
  title: string;
  status: NodeStatus;
};

/* ===== Visualizer group ===== */
const VISUALIZER_KEYS: Readonly<ModuleKey[]> = [
  "VISUALIZER",
  "SECONDARY",
  "DISTANCE_MAP",
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



/* ===== Small pill ===== */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
      {children}
    </span>
  );
}

/* ===== Labels (NodeType 기준) ===== */
const KEY_LABEL: Record<ModuleKey, string> = {
  PDB: "PDB Input",
  COMPOUND: "Compound Input",
  VISUALIZER: "Visualizer",
  SECONDARY: "Secondary",
  DISTANCE_MAP: "Distance Map",
  ADMET: "ADMET",
  UNIPROT_INFO: "UniProt Info",
  PDB_INFO: "PDB Info",
  DEEPKINOME: "DeepKinome",
};

/* ===== Sleek glass tooltip ===== */
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
          "relative rounded-xl border border-zinc-200/70 bg-white/90 backdrop-blur",
          "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/0",
          "px-3 py-2 text-xs text-zinc-700",
          "whitespace-nowrap w-max max-w-none",
          "dark:bg-zinc-900/85 dark:border-zinc-700/60 dark:text-zinc-200",
        ].join(" ")}
      >
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <span
            className={[
              "inline-block h-1.5 w-1.5 rounded-full",
              mode === "to" ? "bg-emerald-500" : "bg-indigo-500",
            ].join(" ")}
          />
          {mode === "to" ? "Can connect to" : "Accepts from"}
        </div>

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

        <span
          className={[
            "absolute left/2 bottom-[-7px] -translate-x-1/2",
            "h-3 w-3 rotate-45",
            "bg-white/90 border border-zinc-200/70",
            "dark:bg-zinc-900/85 dark:border-zinc-700/60",
          ].join(" ")}
          aria-hidden
          style={{ left: "50%" }}
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
  const { Icon: TypeIcon } = getSpec(moduleKey);

  const isVisualizer = VISUALIZER_KEYS.includes(moduleKey);
  const isAdmet = moduleKey === "ADMET";

  const hasTargetHandle =
    isVisualizer || isAdmet || moduleKey === "UNIPROT_INFO" || moduleKey === "PDB_INFO" || moduleKey === "DEEPKINOME";
  const hasSourceHandle = moduleKey === "PDB" || moduleKey === "COMPOUND";

  const base = "group relative rounded-2xl bg-white/90 backdrop-blur shadow-sm ring-1 ring-zinc-200 transition-all";

  // connection hint context
  const { hint, setHint, clearHint, beginDrag, endDrag, shouldHighlightKey, shouldDimKey } = useConnectionHints();

  // what to show in tooltip for *this* node (only when this node is the origin under hover)
  const isOrigin = hint.originNodeId === id && !!hint.mode;

  // 1단계에서는 기존 로직 유지: 고정 테이블을 NodeType 기준으로만 변경
  const TO_BY_KEY: Record<ModuleKey, ModuleKey[]> = {
    PDB: ["VISUALIZER", "SECONDARY", "DISTANCE_MAP", "PDB_INFO", "UNIPROT_INFO"],
    COMPOUND: ["ADMET"],
    VISUALIZER: [],
    SECONDARY: [],
    DISTANCE_MAP: [],
    ADMET: [],
    UNIPROT_INFO: [],
    PDB_INFO: [],
    DEEPKINOME: [], // 목적지 없음
  };

  const FROM_BY_KEY: Record<ModuleKey, ModuleKey[]> = {
    PDB: [],
    COMPOUND: [],
    VISUALIZER: ["PDB"],
    SECONDARY: ["PDB"],
    DISTANCE_MAP: ["PDB"],
    ADMET: ["COMPOUND"],
    UNIPROT_INFO: ["PDB"],
    PDB_INFO: ["PDB"],
    DEEPKINOME: ["PDB"],
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
          onMouseLeave={() => { if (!hint.isDragging) clearHint(); }}
          onPointerDown={() => { setHint("from", id, moduleKey); beginDrag(); }}
          onPointerUp={() => { endDrag(); clearHint(); }}
        />
      )}
      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className={`!w-3 !h-3 !bg-zinc-600 border-2 border-white ${selected ? "shadow-[0_0_0_2px_rgba(99,102,241,0.5)]" : ""}`}
          onMouseEnter={onEnterSource}
          onMouseLeave={() => { if (!hint.isDragging) clearHint(); }}
          onPointerDown={() => { setHint("to", id, moduleKey); beginDrag(); }}
          onPointerUp={() => { endDrag(); clearHint(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
          <TypeIcon aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-800">{title}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <Pill>{KEY_LABEL[moduleKey]}</Pill>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bar} ${s.text} ring-1 ${s.ring}`}>
              <s.Icon aria-hidden />
              {s.label}
            </span>
          </div>
        </div>
      </div>

      {/* Footer (optional) */}
      <div className="px-3 pb-3">
        {isAdmet && (
          <div className="text-[11px] text-zinc-500">Accepts from: Compound</div>
        )}
        {isVisualizer && (
          <div className="text-[11px] text-zinc-500">Accepts from: PDB</div>
        )}
      </div>
    </div>
  );
}

/* ===== React Flow nodeTypes export (page.tsx에서 사용) ===== */
export const nodeTypes: NodeTypes = {
  card: NodeCard,
};
