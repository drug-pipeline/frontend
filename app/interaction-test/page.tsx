"use client";

import React from "react";
import { NglProvider, useNgl } from "../components/NglContext";
import NglWebapp from "../components/NglWebapp";
import InteractionPanel from "../components/InteractionPanel";

// NglWebapp은 viewer prop을 필요로 하므로, 컨텍스트 값을 브릿지로 주입
function NglBridge() {
  const viewer = useNgl();
  return <NglWebapp viewer={viewer} />;
}

export default function Page() {
  return (
    <NglProvider>
      <div className="h-screen grid grid-cols-1 lg:grid-cols-[2fr_1fr]">
        {/* 좌측: NGL 뷰어 */}
        <div className="border-r border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <NglBridge />
        </div>

        {/* 우측: 인터랙션 패널 (viewer prop 제거!) */}
        <div className="border-l border-neutral-200 dark:border-neutral-800 overflow-auto">
          <InteractionPanel />
        </div>
      </div>
    </NglProvider>
  );
}
