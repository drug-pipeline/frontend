"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

type Props = { children: React.ReactNode };

export default function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  // 이전 경로 기억
  useEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  // 이전→현재 경로 기준으로 “/pipeline → /pipeline/edit*” 일 때만 슬라이드
  const prev = prevPathRef.current;
  const shouldSlide =
    prev === "/pipeline" && pathname.startsWith("/pipeline/edit");

  if (!shouldSlide) {
    // 그 외 모든 전환은 애니메이션 X
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: -64 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 64 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
