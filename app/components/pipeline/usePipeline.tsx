"use client";

import React, { createContext, useContext } from "react";
import type { ModuleKey } from "./ModuleRegistry";

export type PipelineContextValue = {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  createNode: (key: ModuleKey) => void;
  openPanel: (key: ModuleKey) => void; // ✅ 모달 열기
};

const PipelineCtx = createContext<PipelineContextValue | undefined>(undefined);

export function PipelineProvider({
  value,
  children,
}: {
  value: PipelineContextValue;
  children: React.ReactNode;
}) {
  return <PipelineCtx.Provider value={value}>{children}</PipelineCtx.Provider>;
}

export function usePipeline(): PipelineContextValue {
  const v = useContext(PipelineCtx);
  if (!v) throw new Error("usePipeline must be used within PipelineProvider");
  return v;
}
