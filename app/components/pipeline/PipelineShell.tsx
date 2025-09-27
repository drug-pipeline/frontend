"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ModuleSidebar } from "./ModuleSidebar";
import { DetailDock } from "./DetailDock";
import { ViewerProvider, useViewer } from "./ViewerContext";
import { PipelineProvider } from "./usePipeline";
import { FlowCanvas } from "./FlowCanvas";
import { type ModuleKey } from "./ModuleRegistry";
import Modal from "../Modal";

// --- viewer prop이 필요한 패널들 ---
import SecondaryStructurePanel from "../SecondaryStructurePanel";
import NglWebapp from "../NglWebapp";
import DistanceMapPanel from "../DistanceMapPanel";
// --- viewer prop이 필요 없는(혹은 스스로 context 사용하는) 패널 예시 ---
import DeepKinomePanel from "../DeepKinomePanel";
import InteractionPanel from "../InteractionPanel";

// viewer를 PipelineShell에서 직접 읽지 않고,
// Wrapper 컴포넌트 안에서 읽어 prop으로 전달
function SecondaryPanelWithViewer() {
  const viewer = useViewer();
  return <SecondaryStructurePanel viewer={viewer} />;
}
function NglWebappWithViewer() {
  const viewer = useViewer();
  return <NglWebapp viewer={viewer} />;
}
function DistanceMapWithViewer() {
  const viewer = useViewer();
  return <DistanceMapPanel viewer={viewer} />;
}

export default function PipelineShell() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // FlowCanvas가 실제 노드 생성 로직을 등록
  const createNodeRef = useRef<(key: ModuleKey) => void>(() => {});

  // Modal 상태: 어떤 모듈을 열지
  const [modalKey, setModalKey] = useState<ModuleKey | null>(null);
  const modalOpen = modalKey !== null;

  const providerValue = useMemo(
    () => ({
      selectedNodeId,
      setSelectedNodeId,
      createNode: (key: ModuleKey) => createNodeRef.current(key),
      openPanel: (key: ModuleKey) => setModalKey(key),
    }),
    [selectedNodeId]
  );

  // modal에 표시할 제목/바디 선택
  const modalTitle = (() => {
    switch (modalKey) {
      case "vis-secondary": return "Visualizer – Secondary";
      case "vis-interaction": return "Visualizer – Interaction";
      case "visualizer": return "Visualizer (NGL)";
      case "distance-map": return "Distance Map";
      case "deepkinome": return "DeepKinome";
      default: return "Viewer";
    }
  })();

  const modalBody = (() => {
    switch (modalKey) {
      case "vis-secondary":
        return <SecondaryPanelWithViewer />;
      case "vis-interaction":
        // InteractionPanel이 viewer prop이 필요하다면 동일한 방식으로 래핑하면 됨.
        // 현재 예시에선 내부에서 context를 사용한다고 가정
        return <InteractionPanel />;
      case "visualizer":
        return <NglWebappWithViewer />;
      case "distance-map":
        return <DistanceMapWithViewer />;
      case "deepkinome":
      return (
        <div className="p-2">
          <DeepKinomePanel />
        </div>
      ); // ✅ 이제 Modal 안에서 보여줌
      default:
        return null;
    }
  })();

  return (
    <ViewerProvider>
      <PipelineProvider value={providerValue}>
        <div className="min-h-screen w-full bg-white text-zinc-900 grid grid-cols-[280px_1fr] grid-rows-[1fr_auto]">
          {/* Sidebar */}
          <aside className="border-r border-zinc-200 p-3">
            <div className="mb-3 font-semibold tracking-tight text-lg">Pipeline Modules</div>
            <ModuleSidebar />
            <div className="mt-6 text-xs text-zinc-500">
              Tip: 클릭하면 캔버스에 노드가 생성됩니다. 노드 간 선을 연결해 흐름을 구성하세요.
            </div>
          </aside>

          {/* Canvas + Detail */}
          <main className="relative">
            <FlowCanvas
              onRegisterCreateNode={(fn) => {
                createNodeRef.current = fn;
              }}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />
            <DetailDock />
          </main>

          {/* Footer */}
          <footer className="col-span-2 border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 flex items-center justify-between">
            <span>Drug Discovery Pipeline • React Flow + Next.js</span>
            <Link href="/" className="underline underline-offset-4">
              Home
            </Link>
          </footer>
        </div>

        {/* ✅ Modal을 Provider 내부에 둔다 */}
        <Modal open={modalOpen} onClose={() => setModalKey(null)} title={modalTitle}>
          {modalBody}
        </Modal>
      </PipelineProvider>
    </ViewerProvider>
  );
}
