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
  OnSelectionChangeParams,
  OnConnectStart,
  OnConnectEnd,
} from "reactflow";
import "reactflow/dist/style.css";

import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/app/components/pipeline2/Header";
import ModuleSidebar, {
  MODULES,
  ModuleSpec,
} from "@/app/components/pipeline2/Modules";
import {
  nodeTypes,
  type NodeData,
  type ModuleKey, // ModuleKey = NodeType (NodeCard에서 통일)
} from "@/app/components/pipeline2/NodeCard";
import NodeDetailDock, {
  type MinimalNodeDTO,
} from "@/app/components/pipeline2/NodeDetailDock";
import DeepKinomePanel from "@/app/components/DeepKinomePanel";
import {
  ConnectionHintsProvider,
  useConnectionHints,
} from "@/app/components/pipeline2/ConnectionHintsContext";
import { canConnect, getSpec, type NodeType } from "@/app/components/pipeline2/NodeRegistry";

/** =====================================
 *  NodeRegistry로 연결 검증 일원화
 * =====================================*/
function allowByRegistry(source?: Node<NodeData>, target?: Node<NodeData>): boolean {
  const sType = source?.data?.key as NodeType | undefined;
  const tType = target?.data?.key as NodeType | undefined;
  if (!sType || !tType) return false;
  return canConnect(sType, tType);
}

/* =========================
 * 서버 스펙 타입
 * =======================*/
type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

/** ✨ Server 타입도 NodeType로 통일 */
type ServerNodeType = NodeType;

/** ✨ 서버에서 들어오는 문자열 가드용 목록 */
const SERVER_NODE_TYPES: readonly NodeType[] = [
  "PDB",
  "COMPOUND",
  "VISUALIZER",
  "SECONDARY",
  "DISTANCE_MAP",
  "ADMET",
  "UNIPROT_INFO",
  "PDB_INFO",
  "DEEPKINOME",
] as const;

/** ✨ 서버 보호용 가드: 불명 값이면 PDB로 폴백 */
function toServerNodeType(x: unknown): ServerNodeType {
  return SERVER_NODE_TYPES.includes(x as NodeType) ? (x as ServerNodeType) : "PDB";
}

/** ===== 백엔드 DTO (Graph API 기준) ===== */
type ProjectDTO = { id: number; name: string; createdAt?: string | null };

type ServerNodeDTO = {
  id: number;
  projectId: number;
  type: ServerNodeType | string; // 서버에서 문자열로 올 수 있으므로 보험
  name: string;
  status: NodeStatus;
  x: number;
  y: number;
  metaJson?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type LinkResponse = {
  id: number;
  projectId: number;
  sourceNodeId: number;
  targetNodeId: number;
  createdAt: string;
};

type NodeDetailResponse = {
  meta?: Record<string, unknown>;
  files?: Array<{ id: number; name: string; size?: number; url?: string }>;
  extra?: Record<string, unknown>;
};

type GraphResponse = {
  project: ProjectDTO;
  nodes: ServerNodeDTO[];
  links: LinkResponse[];
  details: Record<string, NodeDetailResponse>; // key = nodeId
};

type NodeLogsDTO = {
  lines: string[];
};

/* =========================
 * API BASE
 * =======================*/
const API_BASE = "/api";

/* =========================
 * 간단 모달 컴포넌트
 * =======================*/
function SimpleModal(props: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { open, title, children, onClose, wide } = props;
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[20000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div
        className={[
          "absolute right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-2xl bg-white p-5 shadow-xl",
          wide ? "w-[95vw] h-[95vh]" : "w-[480px]",
        ].join(" ")}
      >
        <div className="mb-3 text-lg font-semibold">{title}</div>
        {children}
      </div>
    </div>
  );
}

/* =========================
 * 메인 페이지 (컨텍스트 소비자)
 * =======================*/
function PipelinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = useMemo(() => {
    const idParam = searchParams?.get("id");
    return idParam ? Number(idParam) : undefined;
  }, [searchParams]);

  const [workflowName, setWorkflowName] = useState<string>("Protein Workflow");
  const [loadingInitial, setLoadingInitial] = useState<boolean>(false);

  // React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  // 모든 노드의 현재 좌표를 서버에 저장
  const persistAllNodePositions = useCallback(async () => {
    if (!projectId) return;
    if (!nodes || nodes.length === 0) return;
    try {
      const tasks = nodes.map((n) => {
        const x = Math.round(n.position.x);
        const y = Math.round(n.position.y);
        return fetch(`${API_BASE}/projects/${projectId}/nodes/${n.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y }),
        });
      });
      await Promise.allSettled(tasks);
    } catch (e) {
      console.error("[Persist Positions] error:", e);
    }
  }, [projectId, nodes]);

  // 모든 위치를 저장한 다음 전달된 비동기 작업을 실행하는 유틸
  const saveBefore = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      await persistAllNodePositions();
    } catch (e) {
      console.warn("[saveBefore] persist positions failed (ignored)", e);
    }
    return await fn();
  }, [persistAllNodePositions]);


  // 선택 상태
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // UI 토글
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);

  // 서버 캐시
  const [serverNodeMap, setServerNodeMap] = useState<Record<string, ServerNodeDTO>>({});
  const [detailMap, setDetailMap] = useState<Record<string, NodeDetailResponse>>({});

  // Detail Dock 상태
  const [detailNode, setDetailNode] = useState<ServerNodeDTO | null>(null);
  const [savingNode, setSavingNode] = useState<boolean>(false);
  const [reloadingDetail, setReloadingDetail] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [refreshingLogs, setRefreshingLogs] = useState<boolean>(false);

  // === Rename 모달 상태 ===
  const [renameOpen, setRenameOpen] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>("");

  // === Visualizer/Secondary 모달 ===
  const [vizOpen, setVizOpen] = useState<boolean>(false);
  const [secondaryOpen, setSecondaryOpen] = useState<boolean>(false);

  // === DeepKinome 모달 ===
  const [dkOpen, setDkOpen] = useState<boolean>(false);
  const [dkTaskId, setDkTaskId] = useState<string>("example");

  const { setHint: setHintCtx, beginDrag, endDrag, clearHint } = useConnectionHints();

  /** ✨ DTO → FlowNode: data.key = NodeType 그대로 사용 */
  const dtoToFlowNode = useCallback((dto: ServerNodeDTO): Node<NodeData> => {
    const t = toServerNodeType(dto.type);
    const key: ModuleKey = t; // <-- 핵심: 변환 없이 NodeType 그대로

    const safeStatus: NodeStatus =
      dto.status === "PENDING" ||
      dto.status === "RUNNING" ||
      dto.status === "SUCCESS" ||
      dto.status === "FAILED"
        ? dto.status
        : "PENDING";

    return {
      id: String(dto.id),
      type: "card",
      position: { x: dto.x ?? 0, y: dto.y ?? 0 },
      data: {
        key,
        title: dto.name || key,
        status: safeStatus,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      selectable: true,
    };
  }, []);

  /** ===== Graph 한 번에 로드 ===== */
  const loadGraph = useCallback(async () => {
    if (!projectId) return;
    setLoadingInitial(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/graph?include=nodes,links,details`, { method: "GET" });
      if (!res.ok) throw new Error(`GET /projects/${projectId}/graph failed (${res.status})`);
      const graph: GraphResponse = await res.json();

      // 프로젝트명
      if (graph?.project?.name) setWorkflowName(graph.project.name);

      // 노드/링크
      const flowNodes = (graph.nodes ?? []).map(dtoToFlowNode);
      setNodes(flowNodes);

      const edgesFromServer: Edge[] = (graph.links ?? []).map((l) => ({
        id: String(l.id),
        source: String(l.sourceNodeId),
        target: String(l.targetNodeId),
        animated: true,
        style: { strokeWidth: 2 },
      }));
      setEdges(edgesFromServer);

      // 캐시
      const nmap: Record<string, ServerNodeDTO> = {};
      for (const n of graph.nodes ?? []) nmap[String(n.id)] = n;
      setServerNodeMap(nmap);

      setDetailMap(graph.details ?? {});
    } catch (err) {
      console.error("[Load Graph] error:", err);
      // 실패 시 기존 개별 API 폴백
      try {
        const [nodesRes, linksRes] = await Promise.all([
          fetch(`${API_BASE}/projects/${projectId}/nodes`, { method: "GET" }),
          fetch(`${API_BASE}/projects/${projectId}/links`, { method: "GET" }),
        ]);
        if (nodesRes.ok) {
          const list: ServerNodeDTO[] = await nodesRes.json();
          const flowNodes = (list ?? []).map(dtoToFlowNode);
          setNodes(flowNodes);
          const m: Record<string, ServerNodeDTO> = {};
          for (const n of list) m[String(n.id)] = n;
          setServerNodeMap(m);
        }
        if (linksRes.ok) {
          const list: LinkResponse[] = await linksRes.json();
          const serverEdges: Edge[] = (list ?? []).map((l) => ({
            id: String(l.id),
            source: String(l.sourceNodeId),
            target: String(l.targetNodeId),
            animated: true,
            style: { strokeWidth: 2 },
          }));
          setEdges(serverEdges);
        }
      } catch (e) {
        console.error("[Load Graph Fallback] error:", e);
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [projectId, dtoToFlowNode, setNodes, setEdges]);

  // 저장 먼저, 그 다음 그래프 재로딩
  const syncAndReloadGraph = useCallback(async () => {
    await saveBefore(async () => {
      await loadGraph();
      return;
    });
  }, [saveBefore, loadGraph]);



  // 최초 로드
  useEffect(() => {
    if (!projectId) return;
    loadGraph();
  }, [projectId, loadGraph]);

  // 페이지 이탈/언마운트 시 현재 좌표 저장 (best effort)
  useEffect(() => {
    return () => { void persistAllNodePositions(); };
  }, [persistAllNodePositions]);


  /** ✨ 노드 생성: spec.key(NodeType)를 서버에 그대로 전달 */
  const createNode = useCallback(
    async (spec: ModuleSpec) => {
      if (!projectId) {
        alert("Project ID가 없습니다. URL에 ?id=... 를 지정하세요.");
        return;
      }
      const registry = getSpec(spec.key); // NodeRegistry에서 title, Icon, category 가져오기
      const pos = { x: 140 + Math.random() * 520, y: 100 + Math.random() * 360 };

      const payload = {
        projectId,
        type: spec.key as ServerNodeType, // <-- NodeType 그대로
        name: registry.title,
        status: "PENDING" as NodeStatus,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        metaJson: "{}",
      };

      try {
        // 새 노드 추가 전 현재 위치 저장
        await saveBefore(async () => Promise.resolve());
        const res = await fetch(`${API_BASE}/projects/${projectId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`POST /projects/${projectId}/nodes failed (${res.status})`);
        // 국지 업데이트: 전체 리패치 대신 그래프 재요청(간단한 선택)
        await syncAndReloadGraph();
      } catch (err) {
        console.error("[Create Node] error:", err);
        alert("노드 생성에 실패했습니다.");
      }
    },
    [projectId, loadGraph]
  );

  // 링크 생성
  const postLinkAndAddEdge = useCallback(
    async (conn: Connection | Edge) => {
      if (!projectId) return;
      const sourceId = conn.source;
      const targetId = conn.target;
      if (!sourceId || !targetId) return;

      const source = nodes.find((n) => n.id === sourceId);
      const target = nodes.find((n) => n.id === targetId);
      if (!allowByRegistry(source, target)) return;

      try {
        const body = {
          projectId,
          sourceNodeId: Number(sourceId),
          targetNodeId: Number(targetId),
        };
        const res = await fetch(`${API_BASE}/projects/${projectId}/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          console.error("[Create Link] failed:", res.status);
          alert(`링크 생성 실패 (${res.status}).`);
          return;
        }
        const created: LinkResponse = await res.json();

        // 국지 업데이트: 방금 만든 에지 추가
        setEdges((eds) =>
          addEdge(
            {
              id: String(created.id),
              source: String(created.sourceNodeId),
              target: String(created.targetNodeId),
              animated: true,
              style: { strokeWidth: 2 },
            },
            eds
          )
        );
      } catch (err) {
        console.error("[Create Link] error:", err);
        alert("링크 생성 중 오류가 발생했습니다.");
      }
    },
    [projectId, nodes, setEdges]
  );

  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      await postLinkAndAddEdge(params);
    },
    [postLinkAndAddEdge]
  );

  const isValidConnection = useCallback(
    (conn: Connection): boolean => {
      const source = nodes.find((n) => n.id === conn.source);
      const target = nodes.find((n) => n.id === conn.target);
      return allowByRegistry(source, target);
    },
    [nodes]
  );

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

  // 상세 1건 재로딩 (개별 엔드포인트 사용)
  const reloadDetail = useCallback(
    async (nodeId: string) => {
      if (!projectId || !nodeId) return;
      setReloadingDetail(true);
      try {
        const res = await fetch(`${API_BASE}/nodes/${nodeId}`, { method: "GET" });
        if (!res.ok) throw new Error(`GET node ${nodeId} failed (${res.status})`);
        const dto: ServerNodeDTO = await res.json();

        setDetailNode(dto);
        setServerNodeMap((prev) => ({ ...prev, [String(dto.id)]: dto }));
      } catch (err) {
        console.error("[Reload Node Detail] error:", err);
      } finally {
        setReloadingDetail(false);
      }
    },
    [projectId]
  );

  // 로그 로드 (404 허용)
  const loadNodeLogs = useCallback(
    async (nodeId: string) => {
      if (!projectId || !nodeId) return;
      setRefreshingLogs(true);
      try {
        let res = await fetch(`${API_BASE}/nodes/${nodeId}/logs`, {
          method: "GET",
        });
        if (res.status === 405) {
          // fallback for old route shape
          res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}/logs`, { method: "GET" });
        }
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
          const data: Partial<NodeLogsDTO> = await res.json().catch(() => ({} as Partial<NodeLogsDTO>));
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

  // 선택 변경 → 캐시로 표시 (graph의 details 우선)
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const id = params.nodes?.[0]?.id ?? null;
      setSelectedNodeId(id);
      setLogs(null);
      const cached = id ? serverNodeMap[id] ?? null : null;
      setDetailNode(cached);
    },
    [serverNodeMap]
  );

  // 이름 변경 저장 (국지 갱신)
  const [renaming, setRenaming] = useState<boolean>(false);
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

        // 로컬 캐시/뷰 동기화 (전체 리패치 대신)
        setServerNodeMap((prev) => ({
          ...prev,
          [id]: { ...(prev[id] as ServerNodeDTO), name: newName },
        }));
        setNodes((ns) =>
          ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, title: newName } } : n))
        );
      } catch (err) {
        console.error("[Rename Node] error:", err);
        alert("이름 변경에 실패했습니다.");
      } finally {
        setSavingNode(false);
      }
    },
    [projectId, selectedNodeId]
  );

  const defaultViewport = { x: 0, y: 0, zoom: 1 };

  /** 드래그 시작 → 연결 힌트 컨텍스트 갱신 */
  const onConnectStart: OnConnectStart = (_e, params) => {
    const originId = params.nodeId ?? null;
    const handleType = params.handleType; // 'source' | 'target'
    if (!originId || !handleType) return;

    const origin = nodes.find((n) => n.id === originId);
    const originKey = origin?.data?.key as ModuleKey | undefined;
    if (!originKey) return;

    const mode = handleType === "source" ? "to" : "from";
    setHintCtx(mode, originId, originKey);
    beginDrag();
  };

  const endAllDrag = () => {
    endDrag();
    clearHint();
  };

  const onConnectEnd: OnConnectEnd = () => endAllDrag();
  const onConnectStop = () => endAllDrag();

  // MinimalNodeDTO 안전 변환기
  const toMinimalNode = (dto: ServerNodeDTO | null): MinimalNodeDTO | null => {
    if (!dto) return null;
    const minimal: Partial<MinimalNodeDTO> = {
      id: dto.id as unknown as MinimalNodeDTO["id"],
      name: dto.name as unknown as MinimalNodeDTO["name"],
      type: String(dto.type) as unknown as MinimalNodeDTO["type"],
      status: dto.status as unknown as MinimalNodeDTO["status"],
    };
    return minimal as MinimalNodeDTO;
  };

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
          onOpenRename={() => {
            setRenameInput(workflowName);
            setRenameOpen(true);
          }}
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
          {/* 최초 로딩 오버레이 (한 번만) */}
          {loadingInitial && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/50 text-xs text-zinc-600">
              Loading graph…
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
                        : {
                            ...n,
                            style: {
                              opacity: 0.9,
                              filter: "grayscale(0.12) brightness(0.98)",
                            },
                          }
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
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
            >
              <Background />
              {showMiniMap && <MiniMap zoomable pannable />}
              {showControls && <Controls />}
            </ReactFlow>
          </div>

          {/* 우측 상단 Node Detail Dock */}
          <NodeDetailDock
            open={!!selectedNodeId}
            node={toMinimalNode(detailNode) as MinimalNodeDTO}
            saving={savingNode}
            onRename={renameSelectedNode}
            onRefreshLogs={async () => {
              if (selectedNodeId) await loadNodeLogs(selectedNodeId);
            }}
            logs={logs}
            refreshingLogs={refreshingLogs}
            onReloadDetail={async () => {
              if (selectedNodeId) await reloadDetail(selectedNodeId);
            }}
            reloadingDetail={reloadingDetail}
            projectId={projectId ?? 0}
            onRequestRefreshNodes={async () => {
              // 전체 새로고침 대신 위치 저장만 수행하거나,
              // 필요한 경우에만 그래프 재로드
              await syncAndReloadGraph();
            }}
            onOpenVisualizer={() => {
              setVizOpen(true);
            }}
            onOpenSecondary={() => {
              console.log("[Action] open Secondary modal requested");
              setSecondaryOpen(true);
            }}
            onOpenDeepKinome={() => {
              setDkTaskId("example");
              setDkOpen(true);
            }}
          />

          {/* DeepKinome 모달 */}
          <SimpleModal
            open={dkOpen}
            title="DeepKinome"
            onClose={() => setDkOpen(false)}
            wide
          >
            <div className="h-[calc(100%-1.5rem)]">
              <div className="relative h-full w-full overflow-auto rounded-xl">
                <DeepKinomePanel taskId={dkTaskId} />
              </div>
            </div>
          </SimpleModal>

          {/* 워크플로우 이름 변경 모달 */}
          <SimpleModal open={renameOpen} title="Rename Workflow" onClose={() => setRenameOpen(false)}>
            <div className="space-y-4">
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="Enter new workflow name"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameOpen(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                  disabled={renaming}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!projectId) return;
                    const name = renameInput.trim();
                    if (!name) {
                      alert("이름을 입력하세요.");
                      return;
                    }
                    try {
                      // 프로젝트 이름 PUT 후, 뷰만 업데이트
                      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name }),
                      });
                      if (!res.ok) throw new Error(`PUT /projects/${projectId} failed (${res.status})`);
                      setWorkflowName(name);
                      setRenameOpen(false);
                    } catch (err) {
                      console.error("[Rename Project] error:", err);
                      alert("워크플로우 이름 변경에 실패했습니다.");
                    }
                  }}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                  disabled={renaming}
                >
                  {renaming ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </SimpleModal>
        </main>
      </div>

      {/* 하이라이트 시 디밍 효과 */}
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
    <div className="grid min-h-screen place-items-center text-sm text-zinc-500">
      Loading…
    </div>
  );
}

/** Provider는 바깥에서 감싸기 */
export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ConnectionHintsProvider>
        <PipelinePage />
      </ConnectionHintsProvider>
    </Suspense>
  );
}
