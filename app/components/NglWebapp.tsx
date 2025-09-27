// /app/components/NglWebapp.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

type ViewerProps = {
  viewer: {
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
};

export default function NglWebapp({ viewer }: ViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const params = useSearchParams();
  const [scriptsReady, setScriptsReady] = useState(false);

  useEffect(() => {
    if (!scriptsReady && window.NGL && window.__nglGuiReady) {
      setScriptsReady(true);
    }
  }, [scriptsReady]);

  useEffect(() => {
    if (!scriptsReady || !wrapperRef.current || !containerRef.current) return;

    const NGL = window.NGL;
    if (!NGL) return;

    const wrapper = wrapperRef.current!;
    const container = containerRef.current!;

    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;

    // Stage 생성
    const stage = new NGL.Stage(container, { backgroundColor: "white" });
    viewer.setStage(stage);

    // GUI 부착
    NGL.StageWidget(stage, {
      root: wrapper,
      getBounds: () => wrapper.getBoundingClientRect(),
    });
    ["menubar", "sidebar", "toolbar"].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !wrapper.contains(el)) wrapper.appendChild(el);
    });

    // 예제 리소스 경로
    NGL.cssDirectory = "/examples/css/";
    NGL.documentationUrl = "/examples/docs/";
    NGL.examplesListUrl = "/examples/scriptsList.json";
    NGL.examplesScriptUrl = "/examples/scripts/";
    NGL.DatasourceRegistry.add(
      "data",
      new NGL.StaticDatasource("/examples/data/")
    );

    // mdsrv가 있으면 데이터소스로 등록(옵션)
    const mdsrv = params.get("mdsrv");
    if (mdsrv) {
      const m = new NGL.MdsrvDatasource(mdsrv);
      NGL.DatasourceRegistry.add("file", m);
      NGL.setListingDatasource(m);
      NGL.setTrajectoryDatasource(m);
    }

    // 레이아웃/리사이즈
    const clearInlineStyles = () => {
      if (container.style.width || container.style.height)
        container.style.cssText = "";
    };
    const handleResize = () => {
      clearInlineStyles();
      stage.handleResize();
    };
    mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes" && m.attributeName === "style") {
          clearInlineStyles();
          stage.handleResize();
        }
      }
    });
    mo.observe(container, { attributes: true, attributeFilter: ["style"] });

    ro = new ResizeObserver(handleResize);
    ro.observe(wrapper);
    window.addEventListener("resize", handleResize);
    handleResize();

    // ✅ 초기 구조 로드: /public/data/test.pdb -> /data/test.pdb
    const pdbUrl = "/data/test.pdb";
    stage
      .loadFile(pdbUrl, { defaultRepresentation: false, ext: "pdb" })
      .then((comp) => {
        // 기본 cartoon (sstruc)
        const rep = comp.addRepresentation("cartoon", {
          colorScheme: "sstruc",
          opacity: 1.0,
        });
        viewer.setDefaultRep(rep);

        // hetero
        comp.addRepresentation("ball+stick", { sele: "hetero", color: "grey" });

        viewer.setComponent(comp);
        
        requestAnimationFrame(() => comp.autoView?.() ?? stage.autoView());
      })
      .catch((e) => {
        console.error(e);
        alert("test.pdb 로드 중 오류가 발생했습니다.");
      });

    return () => {
      window.removeEventListener("resize", handleResize);
      ro?.disconnect();
      mo?.disconnect();

      try {
        viewer.setLastSele(null);
        viewer.highlightRep?.dispose();
        viewer.setHighlightRep(null);
      } catch {}
      try {
        viewer.defaultRep?.dispose();
        viewer.setDefaultRep(null);
      } catch {}
      try {
        stage.removeAllComponents?.();
      } catch {}
      try {
        stage.dispose();
      } catch {}
      viewer.setStage(null);
      viewer.setComponent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, scriptsReady]);

  return (
    <>
      {/* assets */}
      <link rel="stylesheet" href="/examples/css/font-awesome.min.css" />
      <link rel="stylesheet" href="/examples/css/main.css" />
      <link id="theme" rel="stylesheet" href="/examples/css/dark.css" />

      {/* NGL 영역 */}
      <div ref={wrapperRef} className="ngl-embed relative w-full h-full">
        <div id="ngl-viewport" ref={containerRef} />
      </div>

      

      <Script
        src="/examples/js/gui.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.__nglGuiReady = true;
          setScriptsReady(true);
        }}
      />

      <style jsx global>{`
        .ngl-embed {
          position: relative;
          overflow: hidden !important;
          contain: layout paint size !important;
        }
        .ngl-embed #menubar {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 32px !important;
          z-index: 30 !important;
        }
        .ngl-embed #sidebar {
          position: absolute !important;
          top: 32px !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 300px !important;
          overflow: auto !important;
          z-index: 20 !important;
        }
        .ngl-embed #toolbar {
          position: absolute !important;
          left: 0 !important;
          right: 300px !important;
          bottom: 0 !important;
          height: 32px !important;
          z-index: 10 !important;
        }
        .ngl-embed #ngl-viewport {
          position: absolute !important;
          top: 32px !important;
          left: 0 !important;
          bottom: 32px !important;
          width: calc(100% - 300px) !important;
          height: calc(100% - 64px) !important;
          overflow: hidden !important;
          contain: layout paint size !important;
          box-sizing: border-box !important;
        }
        .ngl-embed #ngl-viewport canvas {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          max-width: none !important;
          box-sizing: border-box !important;
        }
          /* 사이드바 텍스트만 밝게 (배경 건드리지 않음) */
.ngl-embed #sidebar {
  color: #f5f7fa !important; /* 기본 텍스트 */
}

/* 사이드바 안의 각종 요소가 색을 상속받도록 */
.ngl-embed #sidebar .Label,
.ngl-embed #sidebar .ui-label,
.ngl-embed #sidebar .ui-text,
.ngl-embed #sidebar .Panel,
.ngl-embed #sidebar a,
.ngl-embed #sidebar button,
.ngl-embed #sidebar select,
.ngl-embed #sidebar input,
.ngl-embed #sidebar textarea {
  color: inherit !important;
}

/* 플레이스홀더도 보이게 */
.ngl-embed #sidebar input::placeholder,
.ngl-embed #sidebar textarea::placeholder {
  color: rgba(245, 247, 250, 0.6) !important;
}

      `}</style>
    </>
  );
}
