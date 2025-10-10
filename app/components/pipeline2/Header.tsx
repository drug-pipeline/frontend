"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
    HiChevronDown,
    HiOutlinePencil,
    HiOutlineDuplicate,
    HiOutlineTrash,
    HiChevronLeft,
    HiOutlineCog,
    HiCheck,
} from "react-icons/hi";

type HeaderProps = {
    workflowName: string;
    onOpenRename: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onSave: () => void;
    uiToggles: {
        showMiniMap: boolean;
        showControls: boolean;
    };
    onToggleMiniMap: () => void;
    onToggleControls: () => void;
};

export default function Header({
    workflowName,
    onOpenRename,
    onDuplicate,
    onDelete,
    onSave,
    uiToggles,
    onToggleMiniMap,
    onToggleControls,
}: HeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const settingsRef = useRef<HTMLDivElement | null>(null);

    // 바깥 클릭으로 닫기 + ESC 닫기
    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setSettingsOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setMenuOpen(false);
                setSettingsOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClickOutside);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <header className="border-b border-zinc-200 bg-white/70 backdrop-blur">
            <div className="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* 뒤로가기 → /pipeline */}
                    <Link
                        href="/pipeline"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100"
                        title="Back to Dashboard"
                        aria-label="Back to Dashboard"
                    >
                        <HiChevronLeft className="h-5 w-5 text-zinc-700" />
                    </Link>

                    {/* 워크플로우 이름 + 드롭다운 */}
                    <div className="relative" ref={menuRef}>
                        <div className="flex items-center gap-1">
                            <div className="text-lg sm:text-xl font-bold tracking-tight">
                                {workflowName}
                            </div>
                            <button
                                className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-zinc-100 transition"
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-label="Workflow menu"
                                aria-expanded={menuOpen}
                            >
                                <HiChevronDown
                                    className={[
                                        "text-zinc-600 transition-transform duration-200",
                                        menuOpen ? "rotate-180" : "",
                                    ].join(" ")}
                                />
                            </button>
                        </div>

                        {/* 이름/복제/삭제 드롭다운 */}
                        <div
                            className={[
                                "absolute left-0 top-full mt-2 w-36 z-[9999] rounded-lg border border-zinc-200 bg-white shadow-lg p-1 origin-top-left",
                                "transition-all duration-150",
                                menuOpen
                                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                                    : "opacity-0 scale-95 -translate-y-1 pointer-events-none",
                            ].join(" ")}
                        >
                            <button
                                className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-zinc-100"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onOpenRename();
                                    setMenuOpen(false);
                                }}
                            >
                                <HiOutlinePencil className="text-zinc-600" />
                                <span>Rename</span>
                            </button>
                            <button
                                className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-zinc-100"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onDuplicate();
                                    setMenuOpen(false);
                                }}
                            >
                                <HiOutlineDuplicate className="text-zinc-600" />
                                <span>Duplicate</span>
                            </button>
                            <button
                                className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-100"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onDelete();
                                    setMenuOpen(false);
                                }}
                            >
                                <HiOutlineTrash />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 우측: Settings 아이콘 + Save 버튼 */}
                <div className="flex items-center gap-2">
                    {/* Settings 아이콘 */}
                    <div className="relative" ref={settingsRef}>
                        <button
                            onClick={() => setSettingsOpen((v) => !v)}
                            className="inline-flex items-center justify-center rounded-md bg-transparent h-9 w-9 hover:bg-zinc-100"
                        >
                            <HiOutlineCog className="h-5 w-5 text-zinc-700" />
                        </button>

                        <div
                            className={[
                                "absolute right-0 top-full mt-2 w-36 rounded-lg border border-zinc-200 bg-white shadow-xl p-2 origin-top-right",
                                "transition-all duration-150",
                                settingsOpen
                                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                                    : "opacity-0 scale-95 -translate-y-1 pointer-events-none",
                            ].join(" ")}
                        >
                            <div className="text-xs font-semibold text-zinc-500 px-1 pb-1">Canvas UI</div>

                            <button
                                className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-zinc-100"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={onToggleMiniMap}
                            >
                                <span>MiniMap</span>
                                {uiToggles.showMiniMap ? (
                                    <HiCheck className="text-emerald-600" />
                                ) : (
                                    <span className="text-zinc-400">Off</span>
                                )}
                            </button>

                            <button
                                className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-zinc-100"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={onToggleControls}
                            >
                                <span>Controls</span>
                                {uiToggles.showControls ? (
                                    <HiCheck className="text-emerald-600" />
                                ) : (
                                    <span className="text-zinc-400">Off</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Save 버튼 */}
                    <button
                        onClick={onSave}
                        className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-sm text-white hover:bg-zinc-900 active:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                    >
                        Save
                    </button>
                </div>
            </div>
        </header>
    );
}
