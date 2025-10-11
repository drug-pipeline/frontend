// app/pipeline/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import {
    HiPlus,
    HiOutlineTemplate,
    HiOutlineSearch,
    HiOutlineDuplicate,
    HiOutlineTrash,
    HiOutlineClock,
    HiOutlineUserCircle,
    HiChevronDown,
    HiOutlineFolder,
    HiOutlineEye,
    HiOutlineAdjustments,
    HiOutlineChartBar,
    HiOutlineTable,
    HiOutlineCube,
} from "react-icons/hi";

type Workflow = {
    id: string;
    name: string;
    updatedAt: string; // ISO
    nodes: number;
    tags: string[];
};

type Template = {
    id: string;
    name: string;
    blurb: string;
    tags: string[];
};

const DUMMY_WORKFLOWS: Workflow[] = [
    {
        id: "wf_001",
        name: "Kinase Binding Screen",
        updatedAt: "2025-10-08T12:10:00Z",
        nodes: 8,
        tags: ["Visualizer", "Filter"],
    },
    {
        id: "wf_002",
        name: "ADMET Batch Eval",
        updatedAt: "2025-10-06T09:22:00Z",
        nodes: 5,
        tags: ["ADMET", "Table"],
    },
    {
        id: "wf_003",
        name: "Pocket Scan Prototype",
        updatedAt: "2025-10-04T18:40:00Z",
        nodes: 6,
        tags: ["NGL", "Pocket"],
    },
];

const TEMPLATES: Template[] = [
    {
        id: "ngl-basic",
        name: "NGL Basic Viewer",
        blurb: "Minimal protein viewer with Cartoon/Surface.",
        tags: ["Visualizer", "NGL"],
    },
    {
        id: "viz-interaction",
        name: "Visualizer + Interaction",
        blurb: "Viewer + interaction graph side-by-side.",
        tags: ["Graph", "Binding", "Filter"],
    },
    {
        id: "distance-map",
        name: "Distance Map",
        blurb: "Contact filtering and synced highlights.",
        tags: ["Analysis", "Contacts", "Table"],
    },
    {
        id: "admet-only",
        name: "ADMET Quick Check",
        blurb: "SMILES/SDF input with fast ADMET readout.",
        tags: ["ADMET"],
    },
    {
        id: "uniprot-info",
        name: "UniProt + PDB Info",
        blurb: "Lightweight UniProt/PDB metadata browser.",
        tags: ["Metadata", "Table"],
    },
    {
        id: "pipeline-starter",
        name: "Pipeline Starter",
        blurb: "Minimal in→view→analyze skeleton.",
        tags: ["Starter", "Visualizer"],
    },
];

type TabKey = "projects" | "templates";

function TagIcon({
    tag,
    className = "h-4 w-4",
}: {
    tag: string;
    className?: string;
}) {
    const t = tag.toLowerCase();
    if (t.includes("visual")) return <HiOutlineEye className={className} />;
    if (t.includes("filter") || t.includes("bind"))
        return <HiOutlineAdjustments className={className} />;
    if (t.includes("admet")) return <HiOutlineBeakerSafe className={className} />; // fallback below
    if (t.includes("table") || t.includes("meta"))
        return <HiOutlineTable className={className} />;
    if (t.includes("graph") || t.includes("map"))
        return <HiOutlineChartBar className={className} />;
    if (t.includes("ngl") || t.includes("pocket") || t.includes("starter"))
        return <HiOutlineCube className={className} />;
    return <HiOutlineTemplate className={className} />;
}

/**
 * react-icons/hi 에 Beaker 아이콘 명칭이 환경마다 다를 수 있어서
 * 존재하지 않을 경우를 대비한 안전한 래퍼 (있으면 사용, 없으면 Template로 대체)
 */
function HiOutlineBeakerSafe({ className }: { className?: string }) {
    // 안전하게 타입을 검사하고 JSX로 렌더링
    const MaybeBeaker: unknown = (globalThis as any).HiOutlineBeaker;
    if (typeof MaybeBeaker === "function") {
        const BeakerComp = MaybeBeaker as React.ComponentType<{ className?: string }>;
        return <BeakerComp className={className} />;
    }
    return <HiOutlineTemplate className={className} />;
}

export default function PipelineHomePage() {
    const [activeTab, setActiveTab] = useState<TabKey>("projects");
    const [browseOpen, setBrowseOpen] = useState(false);
    const [query, setQuery] = useState("");

    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement | null>(null);

    // Close account menu on outside click / ESC
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
                setAccountOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setAccountOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const filteredTemplates = useMemo(
        () =>
            TEMPLATES.filter(
                (t) =>
                    t.name.toLowerCase().includes(query.toLowerCase()) ||
                    t.blurb.toLowerCase().includes(query.toLowerCase()) ||
                    t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
            ),
        [query]
    );

    return (
        <div className="min-h-screen bg-white">
            {/* Header : 더 진한 고급 회색 톤 */}
            <header className="border-b border-zinc-200 bg-zinc-100 text-zinc-900">
                <div className="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between">
                    <div className="text-lg sm:text-xl font-semibold tracking-tight">
                        Drug Discovery Web
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/documentation"
                            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200"
                        >
                            Docs
                        </Link>

                        {/* Account */}
                        <div className="relative" ref={accountRef}>
                            <button
                                onClick={() => setAccountOpen((v) => !v)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-200"
                                aria-expanded={accountOpen}
                                aria-label="Account menu"
                            >
                                <HiOutlineUserCircle className="h-6 w-6" />
                                <HiChevronDown
                                    className={`h-4 w-4 transition-transform ${accountOpen ? "rotate-180" : ""
                                        }`}
                                />
                            </button>

                            <div
                                className={[
                                    "absolute right-0 top-full mt-2 w-44 z-[10000] rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-lg p-1 origin-top-right",
                                    "transition-all duration-150",
                                    accountOpen
                                        ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                                        : "opacity-0 scale-95 -translate-y-1 pointer-events-none",
                                ].join(" ")}
                            >
                                <Link
                                    href="/profile"
                                    className="block rounded-md px-2.5 py-2 text-sm hover:bg-zinc-100"
                                    onClick={() => setAccountOpen(false)}
                                >
                                    View Profile
                                </Link>
                                <Link
                                    href="/settings"
                                    className="block rounded-md px-2.5 py-2 text-sm hover:bg-zinc-100"
                                    onClick={() => setAccountOpen(false)}
                                >
                                    Settings
                                </Link>
                                <button
                                    className="w-full text-left rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                        setAccountOpen(false);
                                        // TODO: trigger logout
                                    }}
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero (더 밝은 본문) */}
            <section className="bg-white">
                <div className="mx-auto max-w-7xl px-4 py-14">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
                            Build, iterate, and manage your workflows
                        </h2>
                        <p className="mt-3 text-zinc-600">
                            Create a new pipeline from scratch, or start with a template and
                            customize as you go.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            <Link
  href="#"
  onClick={async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://34.61.162.19/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Kinase Inhibitor Discovery" }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("✅ Project created:", data);

      // 생성 성공 시 /pipeline/edit?id=프로젝트ID 로 이동
      if (data.id) {
        window.location.href = `/pipeline/edit?id=${data.id}`;
      } else {
        alert("Project created but no ID returned.");
      }
    } catch (err) {
      console.error("❌ Failed to create project:", err);
      alert("Project creation failed. Check the backend logs.");
    }
  }}
  className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-900 active:bg-zinc-800"
>
  <HiPlus className="h-5 w-5" />
  Create
</Link>


                            {/* 템플릿 찾기 버튼 (히어로) */}
                            <button
                                onClick={() => setBrowseOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                            >
                                <HiOutlineSearch className="h-5 w-5" />
                                Browse Templates
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main content: 좌측 정렬 + 토글 애니메이션 */}
            <main className="mx-auto max-w-7xl px-4 -mt-4 pb-12">
                <div className="space-y-8">
                    {/* Segmented Toggle with animated highlight */}
                    <div className="flex items-center justify-start">
                        <div className="relative inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
  {/* highlight: transform 제거, left/right로 정확히 반칸 고정 */}
  <div
    className={`absolute top-1 bottom-1 rounded-md bg-white shadow-sm transition-all duration-300 ease-out
      ${activeTab === "projects" ? "left-1 right-1/2" : "left-1/2 right-1"}`}
    aria-hidden
  />
  <button
    onClick={() => setActiveTab("projects")}
    className={`relative z-10 px-4 py-1.5 text-sm rounded-md transition-colors duration-200 min-w-[110px] text-center
      ${activeTab === "projects" ? "text-zinc-900" : "text-zinc-600 hover:text-zinc-800"}`}
    aria-pressed={activeTab === "projects"}
  >
    My Projects
  </button>
  <button
    onClick={() => setActiveTab("templates")}
    className={`relative z-10 px-4 py-1.5 text-sm rounded-md transition-colors duration-200 min-w-[110px] text-center
      ${activeTab === "templates" ? "text-zinc-900" : "text-zinc-600 hover:text-zinc-800"}`}
    aria-pressed={activeTab === "templates"}
  >
    Templates
  </button>
</div>

                    </div>

                    {/* Tab content */}
                    {activeTab === "projects" ? (
                        <section>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {DUMMY_WORKFLOWS.map((wf) => (
                                    <Link
                                        key={wf.id}
                                        href={`/pipeline/edit?id=${encodeURIComponent(wf.id)}`}
                                        className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all cursor-pointer
                               hover:-translate-y-0.5 hover:shadow-lg ring-1 ring-transparent hover:ring-zinc-200 hover:border-zinc-300
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                        aria-label={`Open ${wf.name}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            {/* 아이콘 배지 (프로젝트) */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                                                    {/* 첫 번째 태그 기준으로 아이콘 */}
                                                    <TagIcon tag={wf.tags[0] ?? "project"} className="h-5 w-5" />
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="block truncate text-sm font-semibold text-zinc-900 group-hover:underline">
                                                        {wf.name}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <HiOutlineClock className="h-4 w-4" />
                                                            {new Date(wf.updatedAt).toLocaleString()}
                                                        </span>
                                                        <span>• {wf.nodes} nodes</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100"
                                                    title="Duplicate"
                                                    aria-label="Duplicate"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        // TODO: duplicate
                                                    }}
                                                >
                                                    <HiOutlineDuplicate className="h-5 w-5 text-zinc-600" />
                                                </button>
                                                <button
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100"
                                                    title="Delete"
                                                    aria-label="Delete"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        // TODO: delete
                                                    }}
                                                >
                                                    <HiOutlineTrash className="h-5 w-5 text-zinc-600" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* 사용 노드 미리보기 (프로젝트) */}
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {wf.tags.map((t) => (
                                                <span
                                                    key={t}
                                                    className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md bg-zinc-100 px-2 py-1 text-zinc-700"
                                                >
                                                    <TagIcon tag={t} className="h-3.5 w-3.5" />
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ) : (
                        <section>
                            <div className="mb-3">
                                {/* 템플릿 찾기 보조 버튼 (탭 내부에서도 접근 가능) */}
                                <button
                                    onClick={() => setBrowseOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                                >
                                    <HiOutlineTemplate className="h-4 w-4" />
                                    Browse Templates
                                </button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {TEMPLATES.slice(0, 6).map((tpl) => (
                                    <Link
                                        key={tpl.id}
                                        href={`/pipeline/edit?template=${encodeURIComponent(tpl.id)}`}
                                        className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all cursor-pointer
                               hover:-translate-y-0.5 hover:shadow-lg ring-1 ring-transparent hover:ring-zinc-200 hover:border-zinc-300
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                                                {/* 대표 태그 아이콘 */}
                                                <TagIcon tag={tpl.tags[0] ?? "template"} className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-zinc-900">
                                                    {tpl.name}
                                                </div>
                                                {/* 노드/태그 미리보기 (템플릿) */}
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    {tpl.tags.map((t) => (
                                                        <span
                                                            key={t}
                                                            className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md bg-zinc-100 px-2 py-1 text-zinc-700"
                                                        >
                                                            <TagIcon tag={t} className="h-3.5 w-3.5" />
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-3 line-clamp-3 text-sm text-zinc-600">
                                            {tpl.blurb}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {/* Browse Templates Modal */}
            {browseOpen && (
                <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/30 p-4">
                    <div className="w-[min(960px,95vw)] rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                            <div className="text-sm font-semibold">Browse Templates</div>
                            <button
                                onClick={() => setBrowseOpen(false)}
                                className="text-xs rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="relative w-full">
                                    <HiOutlineSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search templates by name, tag, or description…"
                                        className="w-full rounded-lg border border-zinc-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {filteredTemplates.map((tpl) => (
                                    <Link
                                        key={tpl.id}
                                        href={`/pipeline/edit?template=${encodeURIComponent(tpl.id)}`}
                                        className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all cursor-pointer
                               hover:-translate-y-0.5 hover:shadow-lg ring-1 ring-transparent hover:ring-zinc-200 hover:border-zinc-300"
                                        onClick={() => setBrowseOpen(false)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                                                <TagIcon tag={tpl.tags[0] ?? "template"} className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-zinc-900">
                                                    {tpl.name}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    {tpl.tags.map((t) => (
                                                        <span
                                                            key={t}
                                                            className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md bg-zinc-100 px-2 py-1 text-zinc-700"
                                                        >
                                                            <TagIcon tag={t} className="h-3.5 w-3.5" />
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-3 line-clamp-3 text-sm text-zinc-600">
                                            {tpl.blurb}
                                        </p>
                                    </Link>
                                ))}
                                {filteredTemplates.length === 0 && (
                                    <div className="col-span-full rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                                        No templates match your search.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
