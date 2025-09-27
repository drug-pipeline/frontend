"use client";


import React, { useMemo } from "react";
import { usePipeline } from "./usePipeline";
import { useModuleRegistry } from "./ModuleRegistry";


export function DetailDock() {
const { selectedNodeId, setSelectedNodeId } = usePipeline();
const modules = useModuleRegistry();


const content = useMemo(() => {
if (!selectedNodeId) return null;
const key = selectedNodeId.split("-")[0] as (typeof modules)[number]["key"];
const spec = modules.find((m) => m.key === key);
if (!spec) return null;


return (
<div className="h-[42vh] min-h-[360px] bg-white border-t border-zinc-200 shadow-[-4px_-6px_20px_rgba(0,0,0,0.04)]">
<div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200">
<div className="text-sm font-semibold">{spec.title}</div>
<button
className="text-xs rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-100"
onClick={() => setSelectedNodeId(null)}
>
Close
</button>
</div>
<div className="h-[calc(42vh-44px)] p-3 overflow-auto">
{spec.renderPanel ? (
<div className="h-full">{spec.renderPanel()}</div>
) : (
<Placeholder title={spec.title} />
)}
</div>
</div>
);
}, [selectedNodeId, modules, setSelectedNodeId]);


return content;
}


function Placeholder({ title }: { title: string }) {
return (
<div className="h-full grid place-items-center">
<div className="text-center">
<div className="text-base font-semibold">{title}</div>
<div className="text-sm text-zinc-500 mt-1">아직 자리 표시자입니다. 연결만 확인하세요.</div>
</div>
</div>
);
}