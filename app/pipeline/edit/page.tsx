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
} from "reactflow";
import "reactflow/dist/style.css";

import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/app/components/pipeline2/Header";
import ModuleList, {
  type ModuleSpec as ListModuleSpec,
  type ModuleKey as ListModuleKey,
} from "@/app/components/pipeline2/ModuleList";

/* =========================
 * 모듈 사양
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
 * 서버 NodeDTO & 매핑
 * =======================*/
type ServerNodeType =
  | "PDB"
  | "COMPOUND"
  | "VISUALIZER"
  | "DISTANCE_MAP"
  | "ADMET"
  | "UNIPROT_INFO"
  | "PDB_INFO";

type ServerNodeStatus = "PENDING" | "READY" | "FAILED";

type ServerNodeDTO = {
  id: number;
  projectId: number;
  type: ServerNodeType;
  name: string;
  status: ServerNodeStatus;
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

// ServerNodeType -> ModuleKey (모듈 타이틀/색상/이모지는 MODULES에서 조회)
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
 * 공용 모달 (컴팩트)
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
 * 노드 카드
 * =======================*/
type NodeData = {
  key: ModuleKey;
  title: string;
  color?: string;
  emoji?: string;
  onOpen: (key: ModuleKey) => void;
};

function NodeCard({ data, selected }: NodeProps<NodeData>) {
  const { key, title, color, emoji, onOpen } = data;

  const isPdbInput = key === "pdb-input";
  const isCompoundInput = key === "compound-input";
  const isVisualizer = VISUALIZER_KEYS.includes(key);
  const isAdmet = key === "admet";

  const hasTargetHandle = isVisualizer || isAdmet || key === "uniprot-info" || key === "pdb-info";
  const hasSourceHandle = isPdbInput || isCompoundInput;

  return (
    <div
      className={[
        "group rounded-2xl bg-white/90 backdrop-blur shadow-sm ring-1 ring-zinc-200",
        "hover:shadow-md transition-all",
        selected ? "ring-2 ring-indigo-300 shadow-md" : "",
      ].join(" ")}
    >
      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-3 !h-3 !bg-blue-500 border-2 border-white"
        />
      )}
      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-3 !h-3 !bg-emerald-500 border-2 border-white"
        />
      )}

      <div
        className={[
          "flex items-center justify-between gap-2 px-3 py-2 rounded-t-2xl",
          color ?? "bg-zinc-50",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-base">{emoji ?? "🔹"}</div>
          <div className="text-sm font-semibold leading-tight truncate">{title}</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="text-[10px] text-zinc-500 hidden sm:block">drag • connect</div>
          <button
            type="button"
            onClick={() => onOpen(key)}
            className="text-xs rounded-lg border border-zinc-300 px-2 py-1 bg-white hover:bg-zinc-50"
            aria-label={`Open ${title}`}
            title={`Open ${title}`}
          >
            Open
          </button>
        </div>
      </div>

      <div className="px-3 py-2 text-[11px] text-zinc-500">
        Add inputs → connect to downstream modules. Click <b>Open</b> to load the module UI.
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

/* =========================
 * 실제 페이지(클라이언트, 훅 사용)
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

  // 모듈 모달
  const [modalKey, setModalKey] = useState<ModuleKey | null>(null);
  const modalOpen = modalKey !== null;

  // UI 토글
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Rename 모달
  const [renameOpen, setRenameOpen] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>(workflowName);
  const [renaming, setRenaming] = useState<boolean>(false);

  // 서버 노드 로딩 상태
  const [loadingNodes, setLoadingNodes] = useState<boolean>(false);

  // 이름 로드 (GET /projects/{id})
  useEffect(() => {
    const loadName = async () => {
      if (!projectId) return;
      try {
        setLoadingName(true);
        const res = await fetch(`${API_BASE}/projects/${projectId}`, { method: "GET" });
        if (!res.ok) throw new Error(`GET /projects/${projectId} failed (${res.status})`);
        const data: ProjectDTO = await res.json();
        if (data?.name) {
          setWorkflowName(data.name);     // Header에 바로 반영
          setRenameInput(data.name);
        }
      } catch (err) {
        console.error("[Load Project Name] error:", err);
      } finally {
        setLoadingName(false);
      }
    };
    loadName();
  }, [projectId]);

  // 서버 → ReactFlow 노드 변환
  const dtoToFlowNode = useCallback(
    (dto: ServerNodeDTO): Node<NodeData> => {
      const key = typeToKey[dto.type];
      const meta = MODULES.find(m => m.key === key);
      return {
        id: String(dto.id),
        type: "card",
        position: { x: dto.x ?? 0, y: dto.y ?? 0 },
        data: {
          key,
          title: dto.name ?? meta?.title ?? key,
          color: meta?.color,
          emoji: meta?.emoji,
          onOpen: (k: ModuleKey) => setModalKey(k),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    },
    []
  );

  // 노드 목록 새로고침 (GET /api/projects/{id}/nodes)
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

  // 최초 진입 시 노드 로드
  useEffect(() => {
    if (!projectId) return;
    refreshNodes();
  }, [projectId, refreshNodes]);

  const openRename = useCallback(() => {
    setRenameInput(workflowName);
    setRenameOpen(true);
  }, [workflowName]);

  // Rename 저장 (PUT /projects/{id})
  const submitRename = useCallback(async () => {
    const name = renameInput.trim();
    if (name.length === 0) return;
    if (!projectId) {
      alert("Project ID가 없습니다. URL에 ?id=... 를 지정하세요.");
      return;
    }
    try {
      setRenaming(true);
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`PUT /projects/${projectId} failed (${res.status})`);
      const updated: ProjectDTO = await res.json().catch(() => ({ id: projectId, name } as ProjectDTO));
      setWorkflowName(updated?.name ?? name); // Header 즉시 반영
      setRenameOpen(false);
    } catch (err) {
      console.error("[Rename Project] error:", err);
      alert("프로젝트 이름 변경에 실패했습니다.");
    } finally {
      setRenaming(false);
    }
  }, [renameInput, projectId]);

  // 노드 생성: 서버 저장(POST) → 즉시 재조회(GET)
  const createNode = useCallback(
    async (spec: ModuleSpec) => {
      if (!projectId) {
        alert("Project ID가 없습니다. URL에 ?id=... 를 지정하세요.");
        return;
      }

      // 화면상 무작위 위치 (초기 배치)
      const pos = { x: 140 + Math.random() * 520, y: 100 + Math.random() * 360 };

      // 서버 요청용 페이로드
      const payload = {
        projectId,
        type: keyToType[spec.key],
        name: spec.title,
        status: "PENDING" as ServerNodeStatus,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        meta: {}, // 필요 시 확장
      };

      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`POST /projects/${projectId}/nodes failed (${res.status})`);

        // 서버 반영 후 동기화
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

  // 저장(placeholder)
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

  // Duplicate (확인 → GET → POST)
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
      // if (created.id && created.id > 0) router.push(`/pipeline?page=...&id=${created.id}`);
    } catch (err) {
      console.error("[Duplicate Project] error:", err);
      alert("프로젝트 복제에 실패했습니다.");
    } finally {
      setDuplicating(false);
    }
  }, [projectId, workflowName]);

  // Delete (확인 → DELETE → /pipeline 리다이렉트)
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

  // 모듈 모달 내용
  const modalTitle = modalKey ? MODULES.find((m) => m.key === modalKey)?.title ?? "Module" : "";
  const modalBody = (
    <div className="space-y-3 text-sm text-zinc-700">
      <p>
        <b>{modalTitle}</b> placeholder. 실제 UI/예제는 다음 단계에서 연결합니다.
      </p>
      <ul className="list-disc pl-5 text-zinc-600">
        <li>노드 생성 시 서버 저장(POST) → 즉시 재조회(GET)</li>
        <li>연결 규칙: pdb→visualizer/info, compound→admet</li>
      </ul>
    </div>
  );

  // Header에는 실제 워크플로우명 그대로 전달
  const headerName = workflowName;

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900 grid grid-rows-[56px_1fr]">
      {/* 헤더 */}
      <div className="relative z-[10000]">
        <Header
          workflowName={headerName}
          onOpenRename={openRename}
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
          {/* 로딩 오버레이 (노드 재동기화 중) */}
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

      {/* 모듈 모달 */}
      <Modal open={modalOpen} title={modalTitle} onClose={() => setModalKey(null)}>
        {modalBody}
      </Modal>

      {/* Rename 모달 */}
      <Modal open={renameOpen} title="Rename Workflow" onClose={() => setRenameOpen(false)}>
        <div className="space-y-3">
          <label className="text-sm text-zinc-600">Workflow name</label>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            placeholder="Enter a new name…"
            autoFocus
            disabled={renaming}
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setRenameOpen(false)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              disabled={renaming}
            >
              Cancel
            </button>
            <button
              onClick={submitRename}
              className="rounded-lg bg-black px-3 py-1.5 text-sm text-white hover:bg-zinc-900 disabled:opacity-60"
              disabled={renaming}
            >
              {renaming ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* =========================
 * 페이지 export: Suspense 경계로 감싸기
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
