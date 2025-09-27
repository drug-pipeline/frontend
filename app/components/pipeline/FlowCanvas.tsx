"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
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
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import { useModuleRegistry, type ModuleKey } from "./ModuleRegistry";
import { NodeCard } from "./nodeTypes";
import { useViewer } from "./ViewerContext";

type FlowCanvasProps = {
  onRegisterCreateNode: (fn: (key: ModuleKey) => void) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const VISUALIZER_KEYS: Readonly<ModuleKey[]> = [
  "vis-secondary",
  "vis-interaction",
  "visualizer",
  "distance-map",
  "molprobity",
];

function allowConnection(sourceNode?: Node, targetNode?: Node): boolean {
  const sKey = sourceNode?.data?.key as ModuleKey | undefined;
  const tKey = targetNode?.data?.key as ModuleKey | undefined;
  if (!sKey || !tKey) return false;

  // 1) pdb-input -> (visualizer 시리즈)
  if (sKey === "pdb-input" && VISUALIZER_KEYS.includes(tKey)) return true;

  // 2) compound-input -> admet ✅ 추가
  if (sKey === "compound-input" && tKey === "admet") return true;

  return false;
}

export function FlowCanvas({
  onRegisterCreateNode,
  selectedNodeId,
  setSelectedNodeId,
}: FlowCanvasProps) {
  const rfRef = useRef<HTMLDivElement>(null);
  const viewer = useViewer();
  const modules = useModuleRegistry(viewer);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes: NodeTypes = useMemo(() => ({ card: NodeCard }), []);

  const createNode = useCallback(
    (key: ModuleKey) => {
      const spec = modules.find((m) => m.key === key);
      if (!spec) return;

      const id = `${key}-${Date.now()}-${Math.round(Math.random() * 9999)}`;
      const pos = { x: 120 + Math.random() * 480, y: 80 + Math.random() * 320 };

      const node: Node = {
        id,
        type: "card",
        position: pos,
        data: { key: spec.key, title: spec.title, color: spec.color },
        // 핸들은 NodeCard에서 렌더링하지만, 방향 힌트는 유지
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };

      setNodes((prev) => [...prev, node]);
      setSelectedNodeId(id);
    },
    [modules, setNodes, setSelectedNodeId]
  );

  React.useEffect(() => {
    onRegisterCreateNode(createNode);
  }, [onRegisterCreateNode, createNode]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { strokeWidth: 2 },
            // 시각적으로 보기 좋은 둥근 모서리 느낌
            // (기본 edge 타입에 style만 적용)
          },
          eds
        )
      ),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_evt: React.MouseEvent, n: Node) => setSelectedNodeId(n.id),
    [setSelectedNodeId]
  );

  // 유효한 연결만 허용
  const isValidConnection = useCallback(
    (conn: Connection): boolean => {
      const source = nodes.find((n) => n.id === conn.source);
      const target = nodes.find((n) => n.id === conn.target);
      return allowConnection(source, target);
    },
    [nodes]
  );

  return (
    <div ref={rfRef} className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        fitView
      >
        <Background />
        <MiniMap zoomable pannable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
