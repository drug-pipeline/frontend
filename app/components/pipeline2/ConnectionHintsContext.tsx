"use client";
import React from "react";
import type { ModuleKey } from "./NodeCard";

// Your existing connection rules can be imported or duplicated here
export const ALLOWED: Record<ModuleKey, { to?: ModuleKey[]; from?: ModuleKey[] }> = {
  "pdb-input": { to: ["visualizer", "vis-secondary", "distance-map", "pdb-info", "uniprot-info"] },
  "compound-input": { to: ["admet"] },
  visualizer: { from: ["pdb-input"] },
  "vis-secondary": { from: ["pdb-input"] },
  "distance-map": { from: ["pdb-input"] },
  admet: { from: ["compound-input"] },
  "uniprot-info": { from: ["pdb-input"] },
  "pdb-info": { from: ["pdb-input"] },
};

type HintMode = null | "to" | "from";

type HintState = {
  mode: HintMode;
  originNodeId: string | null;
  originKey: ModuleKey | null;
  isDragging: boolean;            // ← 추가
};

type Ctx = {
  hint: HintState;
  setHint: (mode: HintMode, originNodeId: string | null, originKey: ModuleKey | null) => void;
  clearHint: () => void;
  beginDrag: () => void;          // ← 추가
  endDrag: () => void;            // ← 추가
  shouldHighlightKey: (moduleKey: ModuleKey, nodeId: string) => boolean;
  shouldDimKey: (moduleKey: ModuleKey, nodeId: string) => boolean;
};

const ConnectionHintsContext = React.createContext<Ctx | null>(null);

export function ConnectionHintsProvider({ children }: { children: React.ReactNode }) {
  const [hint, setHintState] = React.useState<HintState>({
    mode: null,
    originNodeId: null,
    originKey: null,
    isDragging: false,            // ← 기본값
  });

  const setHint = React.useCallback((mode: HintMode, originNodeId: string | null, originKey: ModuleKey | null) => {
    setHintState((prev) => ({ ...prev, mode, originNodeId, originKey }));
  }, []);

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
      if (hint.originNodeId === nodeId) return true; // never dim origin; treat as highlighted
      const rule = ALLOWED[hint.originKey] || {};
      const list = hint.mode === "to" ? rule.to : rule.from;
      return !!list?.includes(moduleKey);
    },
    [hint]
  );

  const shouldDimKey = React.useCallback(
    (moduleKey: ModuleKey, nodeId: string) => {
      if (!hint.mode || !hint.originKey) return false; // no dimming if no hint
      if (hint.originNodeId === nodeId) return false;  // origin never dimmed
      const rule = ALLOWED[hint.originKey] || {};
      const list = hint.mode === "to" ? rule.to : rule.from;
      // dim if NOT in the allowed list
      return !(list?.includes(moduleKey));
    },
    [hint]
  );

  const value = React.useMemo<Ctx>(() => ({
    hint, setHint, clearHint, beginDrag, endDrag,
    shouldHighlightKey, shouldDimKey
  }), [hint, setHint, clearHint, beginDrag, endDrag, shouldHighlightKey, shouldDimKey]);


  return <ConnectionHintsContext.Provider value={value}>{children}</ConnectionHintsContext.Provider>;
}

export function useConnectionHints(): Ctx {
  const ctx = React.useContext(ConnectionHintsContext);
  if (!ctx) throw new Error("useConnectionHints must be used within ConnectionHintsProvider");
  return ctx;
}
