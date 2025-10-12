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
  type ModuleKey,
} from "@/app/components/pipeline2/NodeCard";
import NodeDetailDock, {
  type MinimalNodeDTO,
} from "@/app/components/pipeline2/NodeDetailDock";
import NglWebapp from "@/app/components/NglWebapp";
import SecondaryStructurePanel from "@/app/components/SecondaryStructurePanel";
import {
  ConnectionHintsProvider,
  useConnectionHints,
} from "@/app/components/pipeline2/ConnectionHintsContext";

/* =========================
 * 서버 스펙 타입
 * =======================*/
type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

type ServerNodeType =
  | "PDB"
  | "COMPOUND"
  | "VISUALIZER"
  | "SECONDARY"
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
  metaJson?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// 링크 생성/조회 응답
type CreateLinkBody = {
  projectId: number;
  sourceNodeId: number;
  targetNodeId: number;
};
type LinkResponse = {
  id: number;
  projectId: number;
  sourceNodeId: number;
  targetNodeId: number;
  createdAt: string; // ISO
};

type ProjectDTO = {
  id: number;
  name: string;
  createdAt?: string | null;
};

type NodeLogsDTO = {
  lines: string[];
};

/* =========================
 * 모듈 키 <-> 서버 타입 매핑
 * =======================*/
const keyToType: Record<string, ServerNodeType> = {
  "pdb-input": "PDB",
  "compound-input": "COMPOUND",
  visualizer: "VISUALIZER",
  "vis-secondary": "SECONDARY",
  "distance-map": "DISTANCE_MAP",
  admet: "ADMET",
  "uniprot-info": "UNIPROT_INFO",
  "pdb-info": "PDB_INFO",
};

const typeToKey: Record<ServerNodeType, ModuleKey> = {
  PDB: "pdb-input",
  COMPOUND: "compound-input",
  VISUALIZER: "visualizer",
  SECONDARY: "vis-secondary",
  DISTANCE_MAP: "distance-map",
  ADMET: "admet",
  UNIPROT_INFO: "uniprot-info",
  PDB_INFO: "pdb-info",
};

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
    (tKey === "visualizer" ||
      tKey === "vis-secondary" ||
      tKey === "distance-map" ||
      tKey === "pdb-info" ||
      tKey === "uniprot-info")
  ) {
    return true;
  }
  if (sKey === "compound-input" && tKey === "admet") return true;
  return false;
}

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
          wide ? "w-[1080px] h-[720px] max-w-[94vw] max-h-[90vh]" : "w-[480px]",
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

  // 서버 노드 캐시
  const [serverNodeMap, setServerNodeMap] = useState<Record<string, ServerNodeDTO>>({});

  // Detail Dock 상태
  const [detailNode, setDetailNode] = useState<ServerNodeDTO | null>(null);
  const [savingNode, setSavingNode] = useState<boolean>(false);
  const [reloadingDetail, setReloadingDetail] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [refreshingLogs, setRefreshingLogs] = useState<boolean>(false);

  // === Rename 모달 상태 ===
  const [renameOpen, setRenameOpen] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>("");
  const [renaming, setRenaming] = useState<boolean>(false);

  // === Visualizer/Secondary 모달 ===
  const [vizOpen, setVizOpen] = useState<boolean>(false);
  const [secondaryOpen, setSecondaryOpen] = useState<boolean>(false);

  // NGL viewer state (타입 충돌 방지를 위해 any)
  const [viewerStage, setViewerStage] = useState<any>(null);
  const [viewerComp, setViewerComp] = useState<any>(null);
  const [viewerDefaultRep, setViewerDefaultRep] = useState<any>(null);
  const [viewerHighlightRep, setViewerHighlightRep] = useState<any>(null);
  const [viewerLastSele, setViewerLastSele] = useState<string | null>(null);

  const { setHint: setHintCtx, beginDrag, endDrag, clearHint } = useConnectionHints();
  const viewerProp = useMemo(
    () => ({
      stage: viewerStage,
      setStage: setViewerStage,
      component: viewerComp,
      setComponent: setViewerComp,
      defaultRep: viewerDefaultRep,
      setDefaultRep: setViewerDefaultRep,
      highlightRep: viewerHighlightRep,
      setHighlightRep: setViewerHighlightRep,
      lastSele: viewerLastSele,
      setLastSele: setViewerLastSele,
    }),
    [viewerStage, viewerComp, viewerDefaultRep, viewerHighlightRep, viewerLastSele]
  );

  // 프로젝트명 로드
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
  const dtoToFlowNode = useCallback((dto: ServerNodeDTO): Node<NodeData> => {
    const key = typeToKey[dto.type as keyof typeof typeToKey] ?? "pdb-input";
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

      const m: Record<string, ServerNodeDTO> = {};
      for (const n of list) m[String(n.id)] = n;
      setServerNodeMap(m);
    } catch (err) {
      console.error("[Refresh Nodes] error:", err);
    } finally {
      setLoadingNodes(false);
    }
  }, [projectId, dtoToFlowNode, setNodes]);

  // 링크 목록 새로고침 (GET /api/projects/{projectId}/links)
  const refreshLinks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/links`, { method: "GET" });
      if (!res.ok) {
        console.error(`[Refresh Links] GET /projects/${projectId}/links -> ${res.status}`);
        setEdges([]);
        return;
      }
      const list: LinkResponse[] = await res.json();

      const serverEdges: Edge[] = (list ?? []).map((l) => ({
        id: String(l.id),
        source: String(l.sourceNodeId),
        target: String(l.targetNodeId),
        animated: true,
        style: { strokeWidth: 2 },
      }));

      setEdges(serverEdges);
    } catch (err) {
      console.error("[Refresh Links] error:", err);
      setEdges([]);
    }
  }, [projectId, setEdges]);

  // 최초 로드
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await refreshNodes();
      await refreshLinks();
    })();
  }, [projectId, refreshNodes, refreshLinks]);

  // 노드 생성
  const createNode = useCallback(
    async (spec: ModuleSpec) => {
      if (!projectId) {
        alert("Project ID가 없습니다. URL에 ?id=... 를 지정하세요.");
        return;
      }
      const pos = { x: 140 + Math.random() * 520, y: 100 + Math.random() * 360 };

      const payload = {
        projectId,
        type: (keyToType[spec.key] ?? "PDB") as ServerNodeType,
        name: spec.key === "visualizer" ? "Visualizer" : spec.title,
        status: "PENDING" as NodeStatus,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        metaJson: "{}",
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

  // 링크 생성 (POST /api/projects/{projectId}/links)
  const postLinkAndAddEdge = useCallback(
    async (conn: Connection | Edge) => {
      if (!projectId) return;
      const sourceId = conn.source;
      const targetId = conn.target;
      if (!sourceId || !targetId) return;

      const source = nodes.find((n) => n.id === sourceId);
      const target = nodes.find((n) => n.id === targetId);
      if (!allowConnection(source, target)) return;

      try {
        const body: CreateLinkBody = {
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
        const created: LinkResponse = await res.json().catch(() => ({
          id: -1,
          projectId,
          sourceNodeId: Number(sourceId),
          targetNodeId: Number(targetId),
          createdAt: new Date().toISOString(),
        }));

        // 시각화 성공 동기화 (PDB SUCCESS + VISUALIZER/SECONDARY 쌍이면 대상도 SUCCESS)
        try {
          const s = serverNodeMap[String(sourceId)];
          const t = serverNodeMap[String(targetId)];
          const isVisPair =
            ((s?.type === "VISUALIZER" || s?.type === "SECONDARY") &&
              t?.type === "PDB" &&
              t?.status === "SUCCESS") ||
            ((t?.type === "VISUALIZER" || t?.type === "SECONDARY") &&
              s?.type === "PDB" &&
              s?.status === "SUCCESS");
          if (isVisPair && projectId) {
            const targetVisId =
              s?.type === "VISUALIZER" || s?.type === "SECONDARY" ? s.id : t?.id;
            if (targetVisId) {
              const res2 = await fetch(
                `${API_BASE}/projects/${projectId}/nodes/${targetVisId}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "SUCCESS" }),
                }
              );
              if (!res2.ok)
                console.error("[Vis/Secondary->SUCCESS] PUT failed:", res2.status);
              await refreshNodes();
              await refreshLinks();
            }
          }
        } catch (e) {
          console.error("[Post-link Visual SUCCESS sync] error:", e);
        }

        setEdges((eds) =>
          addEdge(
            { ...conn, id: String(created.id), animated: true, style: { strokeWidth: 2 } } as any,
            eds
          )
        );
      } catch (err) {
        console.error("[Create Link] error:", err);
        alert("링크 생성 중 오류가 발생했습니다.");
      }
    },
    [projectId, nodes, setEdges, serverNodeMap, refreshNodes, refreshLinks]
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
      return allowConnection(source, target);
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

  // 상세 1건 재로딩
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
        const res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}/logs`, {
          method: "GET",
        });
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

  // 선택 변경 → 캐시로 표시
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const id = params.nodes?.[0]?.id ?? null;
      setSelectedNodeId(id);
      setLogs(null);
      setDetailNode(id ? serverNodeMap[id] ?? null : null);
    },
    [serverNodeMap]
  );

  // 이름 변경 저장
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
        await refreshNodes();
        await refreshLinks();
      } catch (err) {
        console.error("[Rename Node] error:", err);
        alert("이름 변경에 실패했습니다.");
      } finally {
        setSavingNode(false);
      }
    },
    [projectId, selectedNodeId, refreshNodes, refreshLinks]
  );

  // === 워크플로우명 변경 ===
  const openRenameModal = useCallback(() => {
    setRenameInput(workflowName);
    setRenameOpen(true);
  }, [workflowName]);

  const submitRename = useCallback(async () => {
    if (!projectId) return;
    const name = renameInput.trim();
    if (!name) {
      alert("이름을 입력하세요.");
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
      setWorkflowName(name);
      setRenameOpen(false);
    } catch (err) {
      console.error("[Rename Project] error:", err);
      alert("워크플로우 이름 변경에 실패했습니다.");
    } finally {
      setRenaming(false);
    }
  }, [projectId, renameInput]);

  const defaultViewport = { x: 0, y: 0, zoom: 1 };

  const onConnectStart: OnConnectStart = (_e, params) => {
    const originId = params.nodeId ?? null;
    const handleType = params.handleType; // 'source' | 'target'
    if (!originId || !handleType) return;

    // 현재 nodes에서 origin 모듈키 찾아서 컨텍스트에 주입
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

  const onConnectEnd: OnConnectEnd = () => endAllDrag(); // 드롭 완료 시
  const onConnectStop = () => endAllDrag(); // 드롭 취소/실패 시

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
          onOpenRename={openRenameModal}
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
          {/* 로딩 오버레이 */}
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
            node={detailNode as unknown as MinimalNodeDTO}
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
              await refreshNodes();
              await refreshLinks();
            }}
            onOpenVisualizer={() => {
              setVizOpen(true);
            }}
            onOpenSecondary={() => {
              setSecondaryOpen(true);
            }}
          />

          {/* Visualizer 모달 (NGL) */}
          <SimpleModal open={vizOpen} title="Visualizer" onClose={() => setVizOpen(false)} wide>
            <div className="h-[calc(100%-1.5rem)]">
              <div className="relative h-full w-full">
                <NglWebapp viewer={viewerProp as any} />
              </div>
            </div>
          </SimpleModal>

          {/* Secondary + NGL Split Modal */}
          <SimpleModal
            open={secondaryOpen}
            title="Visualizer + Secondary Structure"
            onClose={() => setSecondaryOpen(false)}
            wide
          >
            <div className="h-[calc(100%-1.5rem)]">
              <div className="grid h-full w-full grid-cols-2 gap-4">
                <div className="relative h-full w-full rounded-xl ring-1 ring-zinc-200 overflow-hidden">
                  <NglWebapp viewer={viewerProp as any} />
                </div>
                <div className="relative h-full w-full rounded-xl ring-1 ring-zinc-200 overflow-auto p-3">
                  <SecondaryStructurePanel viewer={viewerProp as any} />
                </div>
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
                  onClick={submitRename}
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

/** 여기서 Provider가 PipelinePage “바깥”에서 감쌉니다. */
export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ConnectionHintsProvider>
        <PipelinePage />
      </ConnectionHintsProvider>
    </Suspense>
  );
}
