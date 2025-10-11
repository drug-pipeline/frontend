// app/pipeline/edit/page.tsx
"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import ModuleList, {
  type ModuleSpec as ListModuleSpec,
  type ModuleKey as ListModuleKey,
} from "@/app/components/pipeline2/ModuleList";

// Feather Icons (react-icons/fi)
import {
  FiClock,        // PENDING
  FiActivity,     // RUNNING
  FiCheckCircle,  // SUCCESS
  FiXCircle,      // FAILED
} from "react-icons/fi";

/* =========================
 * 모듈 사양 (리스트용)
 *  - 캔버스 노드는 '심플하게 기능명만' 표시 (이모지/알록달록 제거)
 *  - ModuleList가 색/이모지를 쓸 수 있으니 구조는 유지
 * =======================*/
type ModuleKey = ListModuleKey;
type ModuleSpec = ListModuleSpec;

const MODULES: ModuleSpec[] = [
  { key: "pdb-input",      title: "PDB Input",          category: "Input",      color: "bg-emerald-100", emoji: "📦" },
  { key: "compound-input", title: "Compound Input",     category: "Input",      color: "bg-sky-100",     emoji: "🧪" },
  { key: "visualizer",     title: "Visualizer (NGL)",   category: "Visualizer", color: "bg-blue-100",    emoji: "🧭" },
  { key: "distance-map",   title: "Distance Map",       category: "Visualizer", color: "bg-indigo-100",  emoji: "🗺️" },
  { key: "admet",          title: "ADMET",              category: "Analysis",   color: "bg-orange-100",  emoji: "⚗️" },
  { key: "uniprot-info",   title: "UniProt Info",       category: "Info",       color: "bg-amber-100",   emoji: "🧬" },
  { key: "pdb-info",       title: "PDB Info",           category: "Info",       color: "bg-rose-100",    emoji: "🧫" },
];

const VISUALIZER_KEYS: Readonly<ModuleKey[]> = ["visualizer", "distance-map"];

/* =========================
 * 서버 NodeDTO & 매핑 (백엔드 enum과 1:1)
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
  status: NodeStatus;   // ✅ 백엔드와 일치
  x: number;
  y: number;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

// ModuleKey -> ServerNodeType
const keyToType: Record<ModuleKey, ServerNodeType> = {
  "pdb-input": "PDB",
  "compound-input": "COMPOUND",
  "visualizer": "VISUALIZER",
  "distance-map": "DISTANCE_MAP",
  "admet": "ADMET",
  "uniprot-info": "UNIPROT_INFO",
  "pdb-info": "PDB_INFO",
};

// ServerNodeType -> ModuleKey
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
 * 상태별 스타일 & 아이콘 (심플/세련)
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
 * 공용 모달 (남겨둠 - 이후 단계에 필요)
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
 * 노드 데이터 & 컴포넌트 (심플 UI)
 *  - 기능명만 보임
 *  - 상태 바/아이콘/색 반영
 *  - 선택 시 하이라이트
 * =======================*/
type NodeData = {
  key: ModuleKey;
  title: string;
  status: NodeStatus;
};

function NodeCard({ data, selected }: NodeProps<NodeData>) {
  const { title, status } = data;
  const s = statusStyle(status);

  // 핸들 규칙: 입력→출력은 최소만 유지
  // - 시각화/정보 쪽은 target, 입력 쪽은 source
  const isVisualizer = VISUALIZER_KEYS.includes(data.key);
  const isAdmet = data.key === "admet";
  const hasTargetHandle = isVisualizer || isAdmet || data.key === "uniprot-info" || data.key === "pdb-info";
  const hasSourceHandle = data.key === "pdb-input" || data.key === "compound-input";

  const cls =
    "group rounded-2xl bg-white/90 backdrop-blur shadow-sm ring-1 ring-zinc-200 hover:shadow-md transition-all";

  return (
    <div className={`${cls} ${selected ? "ring-2 ring-indigo-300 shadow-md" : ""}`}>
      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-3 !h-3 !bg-zinc-500 border-2 border-white"
        />
      )}
      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-3 !h-3 !bg-zinc-500 border-2 border-white"
        />
      )}

      {/* 상태 바 + 기능명만 */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-2xl ${s.bar}`}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <div className={`flex items-center gap-1.5 min-w-0 ${s.text}`}>
          <s.Icon className="shrink-0" aria-hidden />
          <div className="truncate text-sm font-semibold leading-tight text-zinc-800">{title}</div>
        </div>
      </div>

      {/* 추가 설명 제거 → 심플 */}
      <div className="px-3 py-2 text-[11px] text-zinc-500">
        Drag to connect.
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { card: NodeCard };

/* =========================
 * 연결 규칙 (간단 유지)
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

  // React Flow 상태
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  // 선택 상태 (2단계에서 우측 패널과 연결 예정)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // UI 토글
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);

  // 서버 노드 로딩 상태
  const [loadingNodes, setLoadingNodes] = useState<boolean>(false);

  // 이름 로드
  useEffect(() => {
    const loadName = async () => {
      if (!projectId) return;
      try {
        setLoadingName(true);
        const res = await fetch(`${API_BASE}/projects/${projectId}`, { method: "GET" });
        if (!res.ok) throw new Error(`GET /projects/${projectId} failed (${res.status})`);
        const data: ProjectDTO = await res.json();
        if (data?.name) {
          setWorkflowName(data.name);
        }
      } catch (err) {
        console.error("[Load Project Name] error:", err);
      } finally {
        setLoadingName(false);
      }
    };
    loadName();
  }, [projectId]);

  // 서버 → ReactFlow 노드 변환 (상태 포함)
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

  // 노드 목록 새로고침
  const refreshNodes = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingNodes(true);
      const res = await fetch(`${API_BASE}/projects/${projectId}/nodes`, { method: "GET" });
      if (!res.ok) throw new Error(`GET /projects/${projectId}/nodes failed (${res.status})`);
      const list: ServerNodeDTO[] = await res.json();
      const flowNodes = (list ?? []).map(dtoToFlowNode);
      setNodes(flowNodes);
    } catch (err) {
      console.error("[Refresh Nodes] error:", err);
    } finally {
      setLoadingNodes(false);
    }
  }, [projectId, dtoToFlowNode, setNodes]);

  // 최초 로드
  useEffect(() => {
    if (!projectId) return;
    refreshNodes();
  }, [projectId, refreshNodes]);

  // 노드 생성 (기본: PENDING)
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

  // 엣지 연결
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

  // Header 동작들 (이전 로직 유지)
  const onSave = useCallback(() => {
    const payload = {
      name: workflowName,
      nodes: nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data: {
          key: data.key,
          title: data.title,
          status: data.status,
        },
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
      const created: ProjectDTO = await postRes.json().catch(() => ({ id: -1, name: nameForCopy }));
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

  // 선택 변경(다음 단계 패널 연동용)
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const id = params.nodes?.[0]?.id ?? null;
    setSelectedNodeId(id);
  }, []);

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900 grid grid-rows-[56px_1fr]">
      {/* 헤더 */}
      <div className="relative z-[10000]">
        <Header
          workflowName={workflowName}
          onOpenRename={() => {/* 2단계에서 사용 */}}
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
        <ModuleList modules={MODULES} onCreate={createNode} />

        <main className="relative">
          {/* 로딩 오버레이 */}
          {loadingNodes && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/50 text-xs text-zinc-600">
              Syncing nodes…
            </div>
          )}

          <div className="absolute inset-0">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              {showMiniMap && <MiniMap zoomable pannable />}
              {showControls && <Controls />}
            </ReactFlow>
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================
 * Suspense 경계
 * =======================*/
function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center text-sm text-zinc-500">
      Loading…
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <PipelinePage />
    </Suspense>
  );
}
