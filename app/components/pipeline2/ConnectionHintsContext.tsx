// app/components/pipeline2/ConnectionHintsContext.tsx
"use client";
import React from "react";
import type { ModuleKey } from "./NodeCard";
import { incomingOf, outgoingOf, type NodeType } from "./NodeRegistry";

type HintMode = null | "to" | "from";

type HintState = {
  mode: HintMode;
  originNodeId: string | null;
  originKey: ModuleKey | null; // ModuleKey = NodeType
  isDragging: boolean;
};

type Ctx = {
  hint: HintState;
  setHint: (mode: HintMode, originNodeId: string | null, originKey: ModuleKey | null) => void;
  clearHint: () => void;
  beginDrag: () => void;
  endDrag: () => void;
  shouldHighlightKey: (moduleKey: ModuleKey, nodeId: string) => boolean;
  shouldDimKey: (moduleKey: ModuleKey, nodeId: string) => boolean;
};

const ConnectionHintsContext = React.createContext<Ctx | null>(null);

export function ConnectionHintsProvider({ children }: { children: React.ReactNode }) {
  const [hint, setHintState] = React.useState<HintState>({
    mode: null,
    originNodeId: null,
    originKey: null,
    isDragging: false,
  });

  const setHint = React.useCallback(
    (mode: HintMode, originNodeId: string | null, originKey: ModuleKey | null) => {
      setHintState((prev) => ({ ...prev, mode, originNodeId, originKey }));
    },
    []
  );

  const clearHint = React.useCallback(() => {
    setHintState({ mode: null, originNodeId: null, originKey: null, isDragging: false });
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
      if (hint.originNodeId === nodeId) return true; // origin은 항상 highlight
      const originT = hint.originKey as NodeType;
      const targetT = moduleKey as NodeType;
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
      if (!hint.mode || !hint.originKey) return false;
      if (hint.originNodeId === nodeId) return false; // origin은 dim 금지
      const originT = hint.originKey as NodeType;
      const targetT = moduleKey as NodeType;
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
    [hint, setHint, clearHint, beginDrag, endDrag, shouldHighlightKey, shouldDimKey]
  );

  return <ConnectionHintsContext.Provider value={value}>{children}</ConnectionHintsContext.Provider>;
}

export function useConnectionHints(): Ctx {
  const ctx = React.useContext(ConnectionHintsContext);
  if (!ctx) throw new Error("useConnectionHints must be used within ConnectionHintsProvider");
  return ctx;
}
