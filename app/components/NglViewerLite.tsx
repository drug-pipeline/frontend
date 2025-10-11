// app/components/NglViewerLite.tsx
"use client";

/**
 * 전역 CSS를 추가하지 않는, 가벼운 NGL 뷰어
 * - Tailwind + 로컬 DOM만 사용 → 페이지 전체 글씨 색상 오염 없음
 * - 모달 내/외부 어디서든 안전하게 사용 가능
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

type Source =
    | { kind: "url"; url: string; ext?: string }
    | { kind: "file"; file: File };

type Props = {
    source: Source;
    className?: string;
    background?: "transparent" | "white" | "black";
    initialRepresentation?: "cartoon" | "ball+stick" | "spacefill";
    onReady?: (stage: any, component?: any, defaultRep?: any) => void;
};

export default function NglViewerLite({
    source,
    className,
    background = "transparent",
    initialRepresentation = "cartoon",
    onReady,
}: Props) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const stageRef = useRef<any>(null);
    const compRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [spin, setSpin] = useState(false);

    // 브라우저에서만 동적 import
    const nglPromise = useMemo(
        () => (typeof window !== "undefined" ? import("ngl") : null),
        []
    );

    async function loadStructure(NGL: any) {
        if (!hostRef.current) return;

        // Stage 최초 생성
        if (!stageRef.current) {
            stageRef.current = new NGL.Stage(hostRef.current, {
                backgroundColor:
                    background === "transparent"
                        ? "transparent"
                        : background === "white"
                            ? "white"
                            : "black",
                sampleLevel: 1,
                clipNear: 0,
                clipFar: 100,
                clipDist: 10,
                cameraType: "perspective",
                transparent: background === "transparent",
            });
            window.addEventListener("resize", handleResize);
        }

        setLoading(true);

        // 이전 컴포넌트 정리
        if (compRef.current) {
            stageRef.current.removeComponent(compRef.current);
            compRef.current = null;
        }

        // 파일 로드
        let comp: any;
        if (source.kind === "url") {
            const ext =
                source.ext ??
                source.url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
            comp = await stageRef.current.loadFile(source.url, { ext });
        } else {
            const blobUrl = URL.createObjectURL(source.file);
            const ext = source.file.name.split(".").pop()?.toLowerCase();
            try {
                comp = await stageRef.current.loadFile(blobUrl, { ext });
            } finally {
                URL.revokeObjectURL(blobUrl);
            }
        }

        compRef.current = comp;

        // 기본 표현
        comp.removeAllRepresentations();
        let defaultRep: any = null;
        if (initialRepresentation === "cartoon") {
            defaultRep = comp.addRepresentation("cartoon", { aspectRatio: 4 });
        } else if (initialRepresentation === "ball+stick") {
            defaultRep = comp.addRepresentation("ball+stick", { multipleBond: true });
        } else if (initialRepresentation === "spacefill") {
            defaultRep = comp.addRepresentation("spacefill");
        }

        stageRef.current.autoView();
        setLoading(false);
        onReady?.(stageRef.current, compRef.current, defaultRep);
    }

    // 소스/옵션 변경 시 로드
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!nglPromise) return;
            const mod = await nglPromise;
            const NGL = (mod as any).default ?? mod;
            if (!alive) return;
            await loadStructure(NGL);
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        source.kind === "url" ? (source as any).url : source.kind,
        background,
        initialRepresentation,
    ]);

    // 언마운트 시 정리
    useEffect(() => {
        return () => {
            try {
                window.removeEventListener("resize", handleResize);
                if (stageRef.current) {
                    stageRef.current.dispose();
                    stageRef.current = null;
                }
            } catch {
                // noop
            }
        };
    }, []);

    const handleResize = () => {
        try {
            stageRef.current?.handleResize();
        } catch { }
    };

    const setRep = (
        type: "cartoon" | "ball+stick" | "spacefill" | "surface"
    ) => {
        if (!compRef.current) return;
        compRef.current.removeAllRepresentations();
        if (type === "cartoon") {
            compRef.current.addRepresentation("cartoon", { aspectRatio: 4 });
        } else if (type === "ball+stick") {
            compRef.current.addRepresentation("ball+stick", { multipleBond: true });
        } else if (type === "spacefill") {
            compRef.current.addRepresentation("spacefill");
        } else if (type === "surface") {
            compRef.current.addRepresentation("surface", {
                opacity: 0.6,
                useWorker: true,
            });
        }
    };

    const handleScreenshot = async () => {
        if (!stageRef.current) return;
        const blob = await stageRef.current.makeImage({
            factor: 2,
            antialias: true,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ngl-screenshot.png";
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleSpin = () => {
        if (!stageRef.current) return;
        const next = !spin;
        setSpin(next);
        stageRef.current.setSpin(next);
    };

    const resetView = () => {
        stageRef.current?.autoView();
    };

    return (
        <div className={`relative w-full h-full ${className ?? ""}`} style={{ minHeight: 320 }}>
            {/* 상단 컨트롤바 (로컬 스코프, 전역 오염 없음) */}
            <div className="absolute z-10 top-2 left-2 flex flex-wrap gap-2 rounded-2xl bg-black/50 backdrop-blur px-2 py-2">
                <button onClick={() => setRep("cartoon")} className="text-white text-xs rounded-md px-2 py-1 hover:bg-white/10">Cartoon</button>
                <button onClick={() => setRep("ball+stick")} className="text-white text-xs rounded-md px-2 py-1 hover:bg-white/10">Ball+Stick</button>
                <button onClick={() => setRep("spacefill")} className="text-white text-xs rounded-md px-2 py-1 hover:bg-white/10">Spacefill</button>
                <button onClick={() => setRep("surface")} className="text-white text-xs rounded-md px-2 py-1 hover:bg-white/10">Surface</button>
                <span className="mx-1 w-px bg-white/20" />
                <button onClick={resetView} className="text-white text-xs rounded-md px-2 py-1 hover:bg-white/10">Reset</button>
                <button onClick={toggleSpin} className={`text-white text-xs rounded-md px-2 py-1 hover:bg-white/10 ${spin ? "ring-1 ring-white/50" : ""}`}>{spin ? "Spin On" : "Spin Off"}</button>
                <button onClick={handleScreenshot} className="text-white text-xs rounded-md px-2 py-1 hover:bg-white/10">PNG</button>
            </div>

            {/* 캔버스 호스트 */}
            <div
                ref={hostRef}
                className="absolute inset-0 rounded-xl overflow-hidden border border-black/10 bg-transparent"
            />

            {/* 로딩 오버레이 */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
                    Loading structure…
                </div>
            )}
        </div>
    );
}
