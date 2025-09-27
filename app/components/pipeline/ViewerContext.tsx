"use client";


import React, { createContext, useContext, useMemo, useState } from "react";


export type ViewerState = {
// lightweight cross-module state
pdbName: string | null; // DistanceMap 등에서 사용
setPdbName: (p: string | null) => void;


// NGL specific (선택적으로 채움)
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


const Ctx = createContext<ViewerState | null>(null);
export function ViewerProvider({ children }: { children: React.ReactNode }) {
const [pdbName, setPdbName] = useState<string | null>("test");
const [stage, setStage] = useState<NGL.Stage | null>(null);
const [component, setComponent] = useState<NGL.StructureComponent | null>(null);
const [defaultRep, setDefaultRep] = useState<NGL.Representation | null>(null);
const [highlightRep, setHighlightRep] = useState<NGL.Representation | null>(null);
const [lastSele, setLastSele] = useState<string | null>(null);


const value = useMemo(
() => ({ pdbName, setPdbName, stage, setStage, component, setComponent, defaultRep, setDefaultRep, highlightRep, setHighlightRep, lastSele, setLastSele }),
[pdbName, stage, component, defaultRep, highlightRep, lastSele]
);
return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useViewer() {
const v = useContext(Ctx);
if (!v) throw new Error("useViewer must be used within ViewerProvider");
return v;
}