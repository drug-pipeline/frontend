"use client";

import React, { useCallback, useMemo, useState } from "react";
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

import Header from "@/app/components/pipeline2/Header";

// ===== 모듈 사양 =====
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
    color: string; // tailwind bg-* class
    emoji: string;
};

const MODULES: ModuleSpec[] = [
    { key: "pdb-input", title: "PDB Input", category: "Input", color: "bg-emerald-100", emoji: "📦" },
    { key: "compound-input", title: "Compound Input", category: "Input", color: "bg-sky-100", emoji: "🧪" },
    { key: "visualizer", title: "Visualizer (NGL)", category: "Visualizer", color: "bg-blue-100", emoji: "🧭" },
    { key: "distance-map", title: "Distance Map", category: "Visualizer", color: "bg-indigo-100", emoji: "🗺️" },
    { key: "admet", title: "ADMET", category: "Analysis", color: "bg-orange-100", emoji: "⚗️" },
    { key: "uniprot-info", title: "UniProt Info", category: "Info", color: "bg-amber-100", emoji: "🧬" },
    { key: "pdb-info", title: "PDB Info", category: "Info", color: "bg-rose-100", emoji: "🧫" },
];

const VISUALIZER_KEYS: Readonly<ModuleKey[]> = ["visualizer", "distance-map"];

// ===== 공용 모달 컴포넌트 =====
function Modal({
    open,
    title,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children?: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
            <div className="w-[min(900px,95vw)] rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200">
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

// ===== 노드 데이터/카드 =====
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
                className={["flex items-center justify-between gap-2 px-3 py-2 rounded-t-2xl", color ?? "bg-zinc-50"].join(
                    " "
                )}
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

// ===== 연결 규칙 =====
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

// ===== 페이지 =====
export default function PipelinePage() {
    const [workflowName, setWorkflowName] = useState<string>("Protein Workflow");

    // React Flow 상태
    const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

    // 모듈 모달
    const [modalKey, setModalKey] = useState<ModuleKey | null>(null);
    const modalOpen = modalKey !== null;

    // UI 토글 (Settings)
    const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
    const [showControls, setShowControls] = useState<boolean>(true);

    // Rename 모달
    const [renameOpen, setRenameOpen] = useState<boolean>(false);
    const [renameInput, setRenameInput] = useState<string>(workflowName);

    const openRename = useCallback(() => {
        setRenameInput(workflowName);
        setRenameOpen(true);
    }, [workflowName]);

    const submitRename = useCallback(() => {
        const name = renameInput.trim();
        if (name.length === 0) return;
        setWorkflowName(name);
        setRenameOpen(false);
    }, [renameInput]);

    // 노드 생성
    const createNode = useCallback(
        (spec: ModuleSpec) => {
            const id = `${spec.key}-${Date.now()}-${Math.round(Math.random() * 9999)}`;
            const pos = { x: 140 + Math.random() * 520, y: 100 + Math.random() * 360 };

            const node: Node<NodeData> = {
                id,
                type: "card",
                position: pos,
                data: {
                    key: spec.key,
                    title: spec.title,
                    color: spec.color,
                    emoji: spec.emoji,
                    onOpen: (key: ModuleKey) => setModalKey(key),
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            };
            setNodes((prev) => [...prev, node]);
        },
        [setNodes]
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

    // 복제/삭제/저장
    const onDuplicate = useCallback(() => {
        const idMap = new Map<string, string>();
        const offset = 40;

        const clonedNodes: Node<NodeData>[] = nodes.map((n) => {
            const newId = `${n.id}-copy-${Math.round(Math.random() * 9999)}`;
            idMap.set(n.id, newId);
            return {
                ...n,
                id: newId,
                position: { x: n.position.x + offset, y: n.position.y + offset },
                data: { ...n.data },
            };
        });

        const clonedEdges = edges
            .map((e) => {
                const ns = e.source ? idMap.get(e.source) : undefined;
                const nt = e.target ? idMap.get(e.target) : undefined;
                if (!ns || !nt) return null as unknown as Edge;
                return {
                    ...e,
                    id: `${e.id}-copy-${Math.round(Math.random() * 9999)}`,
                    source: ns,
                    target: nt,
                };
            })
            .filter(Boolean) as Edge[];

        setNodes((prev) => [...prev, ...clonedNodes]);
        setEdges((prev) => [...prev, ...clonedEdges]);
    }, [nodes, edges, setNodes, setEdges]);

    const onDelete = useCallback(() => {
        const ok = confirm("Delete all nodes and edges in this workflow?");
        if (ok) {
            setNodes([]);
            setEdges([]);
        }
    }, [setNodes, setEdges]);

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
        // TODO: POST /api/workflows
    }, [workflowName, nodes, edges]);

    const modalTitle = modalKey ? MODULES.find((m) => m.key === modalKey)?.title ?? "Module" : "";
    const modalBody = (
        <div className="space-y-3 text-sm text-zinc-700">
            <p>
                <b>{modalTitle}</b> placeholder. 실제 UI/예제는 다음 단계에서 연결합니다.
            </p>
            <ul className="list-disc pl-5 text-zinc-600">
                <li>
                    노드 생성 시 자동 오픈 금지 → <b>Open</b> 클릭 시에만 표시
                </li>
                <li>연결 규칙: pdb→visualizer/info, compound→admet</li>
            </ul>
        </div>
    );

    const grouped = useMemo(() => {
        const map = new Map<ModuleSpec["category"], ModuleSpec[]>();
        for (const m of MODULES) {
            const arr = map.get(m.category) ?? [];
            arr.push(m);
            map.set(m.category, arr);
        }
        return map;
    }, []);

    const proOptions = { hideAttribution: true };

    return (
        <div className="min-h-screen w-full bg-white text-zinc-900 grid grid-rows-[56px_1fr]">
            {/* 헤더 */}
            <div className="relative z-[10000]">
                <Header
                    workflowName={workflowName}
                    onOpenRename={openRename}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onSave={onSave}
                    uiToggles={{
                        showMiniMap,
                        showControls,
                    }}
                    onToggleMiniMap={() => setShowMiniMap((v) => !v)}
                    onToggleControls={() => setShowControls((v) => !v)}

                />
            </div>


            {/* 본문 */}
            <div className="grid grid-cols-[300px_1fr]">
                {/* 사이드바 */}
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
                                            onClick={() => createNode(m)}
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

                {/* 캔버스 */}
                <main className="relative">
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
                            proOptions={proOptions}
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
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            onClick={() => setRenameOpen(false)}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitRename}
                            className="rounded-lg bg-black px-3 py-1.5 text-sm text-white hover:bg-zinc-900"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
