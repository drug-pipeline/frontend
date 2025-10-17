"use client";
import React from "react";
import type { ModuleKey } from "./NodeCard";
import {
  incomingOf,
  outgoingOf,
  type NodeType,
} from "@/app/components/pipeline2/NodeRegistry";

const keyToNodeType: Record<ModuleKey, NodeType> = {
  "pdb-input": "PDB",
  "compound-input": "COMPOUND",
  visualizer: "VISUALIZER",
  "vis-secondary": "SECONDARY",
  "distance-map": "DISTANCE_MAP",
  admet: "ADMET",
  "uniprot-info": "UNIPROT_INFO",
  "pdb-info": "PDB_INFO",
  "deep-kinome": "DEEPKINOME",
};

type HintMode = null | "to" | "from";

type HintState = {
  mode: HintMode;
  originNodeId: string | null;
  originKey: ModuleKey | null;
  isDragging: boolean; // ← 추가
};

type Ctx = {
  hint: HintState;
  setHint: (
    mode: HintMode,
    originNodeId: string | null,
    originKey: ModuleKey | null
  ) => void;
  clearHint: () => void;
  beginDrag: () => void; // ← 추가
  endDrag: () => void; // ← 추가
  shouldHighlightKey: (moduleKey: ModuleKey, nodeId: string) => boolean;
  shouldDimKey: (moduleKey: ModuleKey, nodeId: string) => boolean;
};

const ConnectionHintsContext = React.createContext<Ctx | null>(null);

export function ConnectionHintsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hint, setHintState] = React.useState<HintState>({
    mode: null,
    originNodeId: null,
    originKey: null,
    isDragging: false, // ← 기본값
  });

  const setHint = React.useCallback(
    (
      mode: HintMode,
      originNodeId: string | null,
      originKey: ModuleKey | null
    ) => {
      setHintState((prev) => ({ ...prev, mode, originNodeId, originKey }));
    },
    []
  );

  const clearHint = React.useCallback(() => {
    setHintState({
      mode: null,
      originNodeId: null,
      originKey: null,
      isDragging: false,
    });
  }, []);

  const beginDrag = React.useCallback(() => {
    setHintState((prev) => ({ ...prev, isDragging: true }));
  }, []);
  const endDrag = React.useCallback(() => {
    setHintState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const shouldHighlightKey = React.useCallback(
    (moduleKey: ModuleKey, nodeId: string) => {
      if (!hint.mode || !hint.originKey) return false;
      if (hint.originNodeId === nodeId) return true; // never dim origin; treat as highlighted
      const originT = keyToNodeType[hint.originKey];
      const targetT = keyToNodeType[moduleKey];
      if (!originT || !targetT) return false;
      // 드래그 방향에 따라 outgoing / incoming을 사용
      if (hint.mode === "to") {
        return outgoingOf(originT).includes(targetT);
      } else {
        return incomingOf(originT).includes(targetT);
      }
    },
    [hint]
  );

  const shouldDimKey = React.useCallback(
    (moduleKey: ModuleKey, nodeId: string) => {
      if (!hint.mode || !hint.originKey) return false; // no dimming if no hint
      if (hint.originNodeId === nodeId) return false; // origin never dimmed
      const originT = keyToNodeType[hint.originKey];
      const targetT = keyToNodeType[moduleKey];
      if (!originT || !targetT) return false;
      if (hint.mode === "to") {
        return !outgoingOf(originT).includes(targetT);
      } else {
        return !incomingOf(originT).includes(targetT);
      }
    },
    [hint]
  );

  const value = React.useMemo<Ctx>(
    () => ({
      hint,
      setHint,
      clearHint,
      beginDrag,
      endDrag,
      shouldHighlightKey,
      shouldDimKey,
    }),
    [
      hint,
      setHint,
      clearHint,
      beginDrag,
      endDrag,
      shouldHighlightKey,
      shouldDimKey,
    ]
  );

  return (
    <ConnectionHintsContext.Provider value={value}>
      {children}
    </ConnectionHintsContext.Provider>
  );
}

export function useConnectionHints(): Ctx {
  const ctx = React.useContext(ConnectionHintsContext);
  if (!ctx)
    throw new Error(
      "useConnectionHints must be used within ConnectionHintsProvider"
    );
  return ctx;
}
