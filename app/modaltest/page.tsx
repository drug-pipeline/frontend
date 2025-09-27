// /app/modaltest/page.tsx
"use client";

import { useState } from "react";
import Modal from "../components/Modal";
import NglWebapp from "../components/NglWebapp";
import SecondaryStructurePanel from "../components/SecondaryStructurePanel";
import InteractionPanel from "../components/InteractionPanel";
import DistanceMapPanel from "../components/DistanceMapPanel";
import DeepKinomePanel from "../components/DeepKinomePanel";

// 🔑 NGL 컨텍스트 추가
import { NglProvider, useNgl } from "../components/NglContext";

/**
 * Provider 바깥에선 useNgl()을 호출할 수 없으므로
 * Provider 안쪽에 실제 페이지 내용을 그리는 Inner 컴포넌트를 둡니다.
 */
function ModalTestPageInner() {
  // 모든 NGL 관련 상태(stage, component, reps...)를 컨텍스트에서 공유
  const viewer = useNgl();

  const [openVisOnly, setOpenVisOnly] = useState(false);
  const [openSecondary, setOpenSecondary] = useState(false);
  const [openInteraction, setOpenInteraction] = useState(false);
  const [openDistance, setOpenDistance] = useState(false);
  const [openDeepKinome, setOpenDeepKinome] = useState(false);

  return (
    <div className="p-6 flex flex-wrap gap-3">
      {/* 1) Visualizer (단독, 상호작용 X) */}
      <button
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        onClick={() => setOpenVisOnly(true)}
      >
        1) Visualizer
      </button>

      {/* 2) Secondary Structure */}
      <button
        className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={() => setOpenSecondary(true)}
      >
        2) Secondary Structure
      </button>

      {/* 3) Interaction */}
      <button
        className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
        onClick={() => setOpenInteraction(true)}
      >
        3) Interaction
      </button>

      {/* 4) Distance Map */}
      <button
        className="px-4 py-2 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-700"
        onClick={() => setOpenDistance(true)}
      >
        4) Distance Map
      </button>

      {/* 5) DeepKinome */}
      <button
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        onClick={() => setOpenDeepKinome(true)}
      >
        5) DeepKinome
      </button>

      {/* 모달 1: Visualizer (view-only) */}
      <Modal
        open={openVisOnly}
        onClose={() => setOpenVisOnly(false)}
        title="Visualizer (View-only)"
      >
        <div className="relative w-full h-full">
          <div className="absolute inset-0">
            <NglWebapp viewer={viewer} />
          </div>
        </div>
      </Modal>

      {/* 모달 2: NGL + SecondaryStructurePanel */}
      <Modal
        open={openSecondary}
        onClose={() => setOpenSecondary(false)}
        title="Secondary Structure"
      >
        <div className="grid grid-cols-2 w-full h-full ">
          <div className="relative">
            <NglWebapp viewer={viewer} />
          </div>
          <div className="border-l border-neutral-200 dark:border-neutral-800 overflow-auto p-3">
            <SecondaryStructurePanel viewer={viewer} />
          </div>
        </div>
      </Modal>

      {/* 모달 3: NGL + InteractionPanel */}
      <Modal
        open={openInteraction}
        onClose={() => setOpenInteraction(false)}
        title="Interaction"
      >
        <div className="grid grid-cols-2 w-full h-full">
          <div className="relative">
            <NglWebapp viewer={viewer} />
          </div>
          <div className="border-l border-neutral-200 dark:border-neutral-800 overflow-auto">
            <InteractionPanel />
          </div>
        </div>
      </Modal>

      {/* 모달 4: NGL + DistanceMapPanel */}
      <Modal
        open={openDistance}
        onClose={() => setOpenDistance(false)}
        title="NGL + Distance Map"
      >
        <div className="grid grid-cols-2 w-full h-full">
          <div className="relative">
            <NglWebapp viewer={viewer} />
          </div>
          <div className="border-l border-neutral-200 dark:border-neutral-800 overflow-auto">
            <DistanceMapPanel viewer={viewer} />
          </div>
        </div>
      </Modal>

      {/* 모달 5: NGL + DeepKinomePanel */}
      <Modal
        open={openDeepKinome}
        onClose={() => setOpenDeepKinome(false)}
        title="DeepKinome"
      >
        <div className="relative w-full h-full">
          <div className="absolute inset-0">
            <DeepKinomePanel taskId="example" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ModalTestPage() {
  return (
    <NglProvider>
      <ModalTestPageInner />
    </NglProvider>
  );
}
