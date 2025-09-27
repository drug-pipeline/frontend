"use client";
import { useState } from "react";

export type ViewerStateLike = {
  stage: NGL.Stage | null;
  setStage: (s: NGL.Stage | null) => void;
  component: NGL.StructureComponent | null;
  setComponent: (c: NGL.StructureComponent | null) => void;
  defaultRep: NGL.Representation | null;
  setDefaultRep: (r: NGL.Representation | null) => void;
  highlightRep: NGL.Representation | null;
  setHighlightRep: (r: NGL.Representation | null) => void;
  lastSele: string | null;
  setLastSele: (s: string | null) => void;
};

export default function useViewerState(): ViewerStateLike {
  const [stage, setStage] = useState<NGL.Stage | null>(null);
  const [component, setComponent] = useState<NGL.StructureComponent | null>(null);
  const [defaultRep, setDefaultRep] = useState<NGL.Representation | null>(null);
  const [highlightRep, setHighlightRep] = useState<NGL.Representation | null>(null);
  const [lastSele, setLastSele] = useState<string | null>(null);
  return {
    stage, setStage,
    component, setComponent,
    defaultRep, setDefaultRep,
    highlightRep, setHighlightRep,
    lastSele, setLastSele,
  };
}
