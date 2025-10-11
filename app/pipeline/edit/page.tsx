// app/pipeline/edit/page.tsx — explicit sync only (no auto-sync on click)
"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Position,
  Handle,
  type NodeProps,
  type NodeTypes,
  OnSelectionChangeParams,
} from "reactflow";
import "reactflow/dist/style.css";

import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/app/components/pipeline2/Header";

// react-icons/fi (Feather)
import {
  FiClock, // PENDING
  FiActivity, // RUNNING
  FiCheckCircle, // SUCCESS
  FiXCircle, // FAILED
  FiRefreshCw, // logs/detail refresh
  FiEdit2, // rename
  FiSave, // save
  FiPackage, // PDB Input
  FiEye, // Visualizer
  FiMap, // Distance Map
  FiInfo, // Info
  FiUpload, // upload button
  FiTrash2, // file delete
} from "react-icons/fi";

/* =========================
 * 모듈 사양 (사이드바용)
 * =======================*/
type ModuleKey =
  | "pdb-input"
  | "compound-input"
  | "visualizer"
  | "distance-map"
  | "admet"
  | "uniprot-info"
  | "pdb-info";

type ModuleSpec = {
  key: ModuleKey;
  title: string;
  category: "Input" | "Visualizer" | "Analysis" | "Info";
  Icon: React.ComponentType<any>;
  tint: string; // tailwind bg-*
};

const MODULES: ModuleSpec[] = [
  { key: "pdb-input", title: "PDB Input", category: "Input", Icon: FiPackage, tint: "bg-emerald-50" },
  { key: "compound-input", title: "Compound Input", category: "Input", Icon: FiPackage, tint: "bg-sky-50" },
  { key: "visualizer", title: "Visualizer (NGL)", category: "Visualizer", Icon: FiEye, tint: "bg-blue-50" },
  { key: "distance-map", title: "Distance Map", category: "Visualizer", Icon: FiMap, tint: "bg-indigo-50" },
  { key: "admet", title: "ADMET", category: "Analysis", Icon: FiPackage, tint: "bg-orange-50" },
  { key: "uniprot-info", title: "UniProt Info", category: "Info", Icon: FiInfo, tint: "bg-amber-50" },
  { key: "pdb-info", title: "PDB Info", category: "Info", Icon: FiInfo, tint: "bg-rose-50" },
];

const VISUALIZER_KEYS: Readonly<ModuleKey[]> = ["visualizer", "distance-map"];

/* =========================
 * 서버 NodeDTO & 매핑
 * =======================*/
type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

type ServerNodeType =
  | "PDB"
  | "COMPOUND"
  | "VISUALIZER"
  | "DISTANCE_MAP"
  | "ADMET"
  | "UNIPROT_INFO"
  | "PDB_INFO";

type ServerNodeDTO = {
  id: number;
  projectId: number;
  type: ServerNodeType;
  name: string;
  status: NodeStatus;
  x: number;
  y: number;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

const keyToType: Record<ModuleKey, ServerNodeType> = {
  "pdb-input": "PDB",
  "compound-input": "COMPOUND",
  visualizer: "VISUALIZER",
  "distance-map": "DISTANCE_MAP",
  admet: "ADMET",
  "uniprot-info": "UNIPROT_INFO",
  "pdb-info": "PDB_INFO",
};

const typeToKey: Record<ServerNodeType, ModuleKey> = {
  PDB: "pdb-input",
  COMPOUND: "compound-input",
  VISUALIZER: "visualizer",
  DISTANCE_MAP: "distance-map",
  ADMET: "admet",
  UNIPROT_INFO: "uniprot-info",
  PDB_INFO: "pdb-info",
};

/* =========================
 * 상태별 스타일 & 아이콘
 * =======================*/
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

/* =========================
 * 공용 Modal (유지)
 * =======================*/
function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "w-[min(420px,92vw)]",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-3">
      <div className={`${maxWidth} rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200`}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
          <div className="text-sm font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="text-xs rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* =========================
 * 노드 컴포넌트 (심플 + 가독성 강화)
 * =======================*/
type NodeData = {
  key: ModuleKey;
  title: string;
  status: NodeStatus;
};

const KeyIcon: Record<ModuleKey, React.ComponentType<any>> = {
  "pdb-input": FiPackage,
  "compound-input": FiPackage,
  visualizer: FiEye,
  "distance-map": FiMap,
  admet: FiPackage,
  "uniprot-info": FiInfo,
  "pdb-info": FiInfo,
};

function NodeCard({ data, selected }: NodeProps<NodeData>) {
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
          <div className="truncate text-sm font-semibold leading-tight text-zinc-900">{title}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-600">
        <TypeIcon className="shrink-0" />
        <span className="truncate">Drag to connect.</span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { card: NodeCard };

/* =========================
 * 연결 규칙
 * =======================*/
function allowConnection(
  sourceNode?: Node<NodeData>,
  targetNode?: Node<NodeData>
): boolean {
  const sKey = sourceNode?.data?.key as ModuleKey | undefined;
  const tKey = targetNode?.data?.key as ModuleKey | undefined;
  if (!sKey || !tKey) return false;

  if (
    sKey === "pdb-input" &&
    (tKey === "visualizer" || tKey === "distance-map" || tKey === "pdb-info" || tKey === "uniprot-info")
  ) {
    return true;
  }
  if (sKey === "compound-input" && tKey === "admet") return true;
  return false;
}

/* =========================
 * API
 * =======================*/
const API_BASE = "/api";

type ProjectDTO = {
  id: number;
  name: string;
  createdAt?: string | null;
};

type NodeLogsDTO = {
  lines: string[];
};

/* =========================
 * 우측 상단 Node Detail Dock (+ 파일 업로드 더미)
 * =======================*/
function StatusPill({ status }: { status: NodeStatus }) {
  const s = statusStyle(status);
  const Icon = s.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.bar} ${s.text} ring-1 ${s.ring}`}
      title={s.label}
    >
      <Icon aria-hidden />
      {s.label}
    </span>
  );
}

function NodeDetailDock({
  open,
  node,
  saving,
  onRename,
  onRefreshLogs,
  logs,
  refreshingLogs,
  onReloadDetail,
  reloadingDetail,
}: {
  open: boolean;
  node: ServerNodeDTO | null;
  saving: boolean;
  onRename: (newName: string) => void;
  onRefreshLogs: () => void;
  logs: string[] | null;
  refreshingLogs: boolean;
  onReloadDetail: () => void;
  reloadingDetail: boolean;
}) {
  const [editMode, setEditMode] = useState(false);
  const [localName, setLocalName] = useState(node?.name ?? "");

  // 더미 파일 상태
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    setLocalName(node?.name ?? "");
    setEditMode(false);
    // 선택 노드 바뀔 때마다 더미 파일 목록도 초기화(데모 목적)
    setFiles([]);
  }, [node?.id]);

  if (!open || !node) return null;

  return (
    <aside className="pointer-events-auto absolute right-4 top-4 z-[1000] w-[min(380px,92vw)] rounded-2xl bg-white/95 backdrop-blur shadow-xl ring-1 ring-zinc-200">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <div className="flex flex-col">
          <div className="text-xs text-zinc-500">Node Detail</div>
          <div className="mt-0.5 text-sm font-semibold text-zinc-900">
            {editMode ? (
              <input
                className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                maxLength={120}
                placeholder="Node name"
                autoFocus
              />
            ) : (
              node.name || "(untitled)"
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReloadDetail}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
            title="Reload latest from server"
            disabled={reloadingDetail}
          >
            <FiRefreshCw className={reloadingDetail ? "animate-spin" : ""} />
            {reloadingDetail ? "Syncing…" : "Reload"}
          </button>

          {!editMode ? (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
              onClick={() => setEditMode(true)}
              title="Rename"
            >
              <FiEdit2 />
              Rename
            </button>
          ) : (
            <button
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              onClick={() => {
                if (!localName.trim() || localName === node.name) {
                  setEditMode(false);
                  return;
                }
                onRename(localName.trim());
              }}
              title="Save"
            >
              <FiSave />
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Status</div>
            <div className="mt-1">
              <StatusPill status={node.status} />
            </div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Type</div>
            <div className="mt-1 text-xs font-medium text-zinc-700">{node.type}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Node ID</div>
            <div className="mt-1 text-xs font-medium text-zinc-700">{node.id}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Position</div>
            <div className="mt-1 text-xs font-medium text-zinc-700">
              x: {node.x}, y: {node.y}
            </div>
          </div>
        </div>

        {/* 파일 업로드 (더미 구현) */}
        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-800">Files (demo)</div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50">
              <FiUpload />
              Upload
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  const names = Array.from(e.target.files ?? []).map((f) => f.name);
                  if (names.length) setFiles((prev) => [...prev, ...names]);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {files.length === 0 ? (
            <div className="text-[11px] text-zinc-500">No files uploaded.</div>
          ) : (
            <ul className="space-y-1">
              {files.map((name, idx) => (
                <li
                  key={`${name}-${idx}`}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1 text-[11px] ring-1 ring-zinc-200/70"
                >
                  <span className="truncate">{name}</span>
                  <button
                    className="inline-flex items-center gap-1 rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] hover:bg-zinc-100"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <FiTrash2 />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-800">Activity Logs</div>
          <button
            onClick={onRefreshLogs}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
            title="Refresh logs"
            disabled={refreshingLogs}
          >
            <FiRefreshCw className={refreshingLogs ? "animate-spin" : ""} />
            {refreshingLogs ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="max-h-[220px] overflow-auto rounded-lg bg-zinc-50 p-2 text-[11px] leading-relaxed ring-1 ring-zinc-200/70">
          {logs && logs.length > 0 ? (
            <pre className="whitespace-pre-wrap text-zinc-700">{logs.join("\n")}</pre>
          ) : (
            <div className="text-zinc-500">No logs.</div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* =========================
 * 사이드바(Modules)
 * =======================*/
function ModuleSidebar({
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

/* =========================
 * 페이지
 * =======================*/
function PipelinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = useMemo(() => {
    const idParam = searchParams?.get("id");
    return idParam ? Number(idParam) : undefined;
  }, [searchParams]);

  const [workflowName, setWorkflowName] = useState<string>("Protein Workflow");
  const [loadingName, setLoadingName] = useState<boolean>(false);

  // React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  // 선택 상태
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // UI 토글
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);

  // 서버 노드 로딩 상태
  const [loadingNodes, setLoadingNodes] = useState<boolean>(false);

  // 서버 노드 캐시 (선택 시 즉시 표시)
  const [serverNodeMap, setServerNodeMap] = useState<Record<string, ServerNodeDTO>>({});

  // Detail Dock 상태
  const [detailNode, setDetailNode] = useState<ServerNodeDTO | null>(null);
  const [savingNode, setSavingNode] = useState<boolean>(false);
  const [reloadingDetail, setReloadingDetail] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [refreshingLogs, setRefreshingLogs] = useState<boolean>(false);

  // 이름 로드 (명시적 API 호출)
  useEffect(() => {
    const loadName = async () => {
      if (!projectId) return;
      try {
        setLoadingName(true);
        const res = await fetch(`${API_BASE}/projects/${projectId}`, { method: "GET" });
        if (!res.ok) throw new Error(`GET /projects/${projectId} failed (${res.status})`);
        const data: ProjectDTO = await res.json();
        if (data?.name) setWorkflowName(data.name);
      } catch (err) {
        console.error("[Load Project Name] error:", err);
      } finally {
        setLoadingName(false);
      }
    };
    loadName();
  }, [projectId]);

  // DTO -> Flow Node
  const dtoToFlowNode = useCallback(
    (dto: ServerNodeDTO): Node<NodeData> => {
      const key = typeToKey[dto.type];
      return {
        id: String(dto.id),
        type: "card",
        position: { x: dto.x ?? 0, y: dto.y ?? 0 },
        data: {
          key,
          title: dto.name || key,
          status: dto.status ?? "PENDING",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        selectable: true,
      };
    },
    []
  );

  // 노드 목록 새로고침 (명시적 API 호출로만 사용)
  const refreshNodes = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingNodes(true);
      const res = await fetch(`${API_BASE}/projects/${projectId}/nodes`, { method: "GET" });
      if (!res.ok) throw new Error(`GET /projects/${projectId}/nodes failed (${res.status})`);
      const list: ServerNodeDTO[] = await res.json();
      const flowNodes = (list ?? []).map(dtoToFlowNode);
      setNodes(flowNodes);
      // 캐시 갱신
      const m: Record<string, ServerNodeDTO> = {};
      for (const n of list) m[String(n.id)] = n;
      setServerNodeMap(m);

      // 선택된 노드가 있으면 캐시로 detail도 즉시 갱신 (네트워크 X)
      if (selectedNodeId) {
        setDetailNode(m[selectedNodeId] ?? null);
      }
    } catch (err) {
      console.error("[Refresh Nodes] error:", err);
    } finally {
      setLoadingNodes(false);
    }
  }, [projectId, dtoToFlowNode, setNodes, selectedNodeId]);

  // 최초 로드만 수행 (초기 동기화 1회)
  useEffect(() => {
    if (!projectId) return;
    refreshNodes();
  }, [projectId, refreshNodes]);

  // 노드 생성 (명시적 API 호출)
  const createNode = useCallback(
    async (spec: ModuleSpec) => {
      if (!projectId) {
        alert("Project ID가 없습니다. URL에 ?id=... 를 지정하세요.");
        return;
      }
      const pos = { x: 140 + Math.random() * 520, y: 100 + Math.random() * 360 };
      const payload = {
        projectId,
        type: keyToType[spec.key],
        name: spec.title,
        status: "PENDING" as NodeStatus,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        meta: {},
      };

      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`POST /projects/${projectId}/nodes failed (${res.status})`);
        await refreshNodes();
      } catch (err) {
        console.error("[Create Node] error:", err);
        alert("노드 생성에 실패했습니다.");
      }
    },
    [projectId, refreshNodes]
  );

  // 엣지 연결 (로컬 상태만)
  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, style: { strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const isValidConnection = useCallback(
    (conn: Connection): boolean => {
      const source = nodes.find((n) => n.id === conn.source);
      const target = nodes.find((n) => n.id === conn.target);
      return allowConnection(source, target);
    },
    [nodes]
  );

  // Header 동작 (명시적 Save — 현재는 콘솔 저장)
  const onSave = useCallback(() => {
    const payload = {
      name: workflowName,
      nodes: nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data: { key: data.key, title: data.title, status: data.status },
      })),
      edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
      })),
      savedAt: new Date().toISOString(),
    };
    console.log("[Pipeline Save]", payload);
  }, [workflowName, nodes, edges]);

  const [duplicating, setDuplicating] = useState<boolean>(false);
  const onDuplicate = useCallback(async () => {
    if (!projectId) {
      alert("Project ID가 없습니다. URL에 ?id=... 를 지정하세요.");
      return;
    }
    const ok = confirm(`이 워크플로우를 복제할까요?\n\n${workflowName}`);
    if (!ok) return;

    try {
      setDuplicating(true);
      const getRes = await fetch(`${API_BASE}/projects/${projectId}`, { method: "GET" });
      if (!getRes.ok) throw new Error(`GET /projects/${projectId} failed (${getRes.status})`);
      const original: ProjectDTO = await getRes.json();
      const nameForCopy = (original?.name || workflowName) + " (Copy)";

      const postRes = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameForCopy }),
      });
      if (!postRes.ok) throw new Error(`POST /projects failed (${postRes.status})`);
      const created: ProjectDTO = await postRes
        .json()
        .catch(() => ({ id: -1, name: nameForCopy }));
      alert(`프로젝트가 복제되었습니다.\n[${created.name}] (id: ${created.id ?? "?"})`);
    } catch (err) {
      console.error("[Duplicate Project] error:", err);
      alert("프로젝트 복제에 실패했습니다.");
    } finally {
      setDuplicating(false);
    }
  }, [projectId, workflowName]);

  const [deleting, setDeleting] = useState<boolean>(false);
  const onDelete = useCallback(async () => {
    if (!projectId) {
      alert("Project ID가 없습니다. URL에 ?id=... 를 지정하세요.");
      return;
    }
    const ok = confirm(`정말 삭제할까요?\n\n${workflowName}\n이 작업은 되돌릴 수 없습니다.`);
    if (!ok) return;

    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /projects/${projectId} failed (${res.status})`);
      alert("프로젝트가 삭제되었습니다.");
      router.push("/pipeline");
    } catch (err) {
      console.error("[Delete Project] error:", err);
      alert("프로젝트 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }, [projectId, workflowName, router]);

  // 상세 1건 재로딩 (명시적 버튼)
  const reloadDetail = useCallback(
    async (nodeId: string) => {
      if (!projectId || !nodeId) return;
      setReloadingDetail(true);
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}`, {
          method: "GET",
        });
        if (!res.ok) throw new Error(`GET node ${nodeId} failed (${res.status})`);
        const dto: ServerNodeDTO = await res.json();
        setDetailNode(dto);
        // 캐시도 갱신
        setServerNodeMap((prev) => ({ ...prev, [String(dto.id)]: dto }));
      } catch (err) {
        console.error("[Reload Node Detail] error:", err);
      } finally {
        setReloadingDetail(false);
      }
    },
    [projectId]
  );

  // 로그 로드 (명시적 버튼)
  const loadNodeLogs = useCallback(
    async (nodeId: string) => {
      if (!projectId || !nodeId) return;
      setRefreshingLogs(true);
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}/logs`, { method: "GET" });

        if (res.status === 404) {
          setLogs([]);
          return;
        }
        if (!res.ok) {
          console.error(`[Load Node Logs] ${nodeId} -> ${res.status}`);
          setLogs([]);
          return;
        }

        let lines: string[] = [];
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data: Partial<NodeLogsDTO> = await res.json().catch(() => ({}));
          if (Array.isArray(data?.lines)) lines = data.lines!;
        } else {
          const text = await res.text().catch(() => "");
          if (text) lines = text.split("\n");
        }
        setLogs(lines);
      } catch (err) {
        console.error("[Load Node Logs] error:", err);
        setLogs([]);
      } finally {
        setRefreshingLogs(false);
      }
    },
    [projectId]
  );

  // 선택 변경 → 네트워크 호출 없이 캐시로만 표시
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const id = params.nodes?.[0]?.id ?? null;
      setSelectedNodeId(id);
      setLogs(null);
      setDetailNode(id ? serverNodeMap[id] ?? null : null); // 캐시 사용, 클릭만으로는 동기화하지 않음
    },
    [serverNodeMap]
  );

  // 이름 변경 저장 (명시적 API 호출)
  const renameSelectedNode = useCallback(
    async (newName: string) => {
      const id = selectedNodeId;
      if (!projectId || !id) return;
      try {
        setSavingNode(true);
        const res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
        if (!res.ok) throw new Error(`PUT node ${id} failed (${res.status})`);
        // 명시적 동기화: 목록/캐시 갱신
        await refreshNodes();
      } catch (err) {
        console.error("[Rename Node] error:", err);
        alert("이름 변경에 실패했습니다.");
      } finally {
        setSavingNode(false);
      }
    },
    [projectId, selectedNodeId, refreshNodes]
  );

  // (줌 고정) 초기 뷰포트만 지정
  const defaultViewport = { x: 0, y: 0, zoom: 1 };

  return (
    <div
      className={[
        "min-h-screen w-full bg-white text-zinc-900 grid grid-rows-[56px_1fr]",
        selectedNodeId ? "selection-has-node" : "",
      ].join(" ")}
    >
      {/* 헤더 */}
      <div className="relative z-[10000]">
        <Header
          workflowName={workflowName}
          onOpenRename={() => {}}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onSave={onSave}
          uiToggles={{ showMiniMap, showControls }}
          onToggleMiniMap={() => setShowMiniMap((v) => !v)}
          onToggleControls={() => setShowControls((v) => !v)}
        />
      </div>

      {/* 본문 */}
      <div className="grid grid-cols-[300px_1fr]">
        <ModuleSidebar modules={MODULES} onCreate={createNode} />

        <main className="relative">
          {/* 로딩 오버레이 (명시적 동기화 때만 표시) */}
          {loadingNodes && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/50 text-xs text-zinc-600">
              Syncing nodes…
            </div>
          )}

          {/* React Flow Canvas */}
          <div className="absolute inset-0">
            <ReactFlow
              nodes={
                selectedNodeId
                  ? nodes.map((n) =>
                      n.id === selectedNodeId
                        ? n
                        : { ...n, style: { opacity: 0.9, filter: "grayscale(0.12) brightness(0.98)" } }
                    )
                  : nodes
              }
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              defaultViewport={defaultViewport}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              {showMiniMap && <MiniMap zoomable pannable />}
              {showControls && <Controls />}
            </ReactFlow>
          </div>

          {/* 우측 상단 Node Detail Dock */}
          <NodeDetailDock
            open={!!selectedNodeId}
            node={detailNode}
            saving={savingNode}
            onRename={renameSelectedNode}
            onRefreshLogs={() => {
              if (!selectedNodeId) return;
              loadNodeLogs(selectedNodeId);
            }}
            logs={logs}
            refreshingLogs={refreshingLogs}
            onReloadDetail={() => {
              if (!selectedNodeId) return;
              reloadDetail(selectedNodeId);
            }}
            reloadingDetail={reloadingDetail}
          />
        </main>
      </div>

      {/* 하이라이트 시 디밍 효과 (캔버스 전체에 적용) */}
      <style>{`
        .selection-has-node .react-flow__node { transition: filter 120ms ease, opacity 120ms ease; }
      `}</style>
    </div>
  );
}

/* =========================
 * Suspense 경계
 * =======================*/
function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center text-sm text-zinc-500">Loading…</div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <PipelinePage />
    </Suspense>
  );
}
