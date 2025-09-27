"use client";
import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 컨테이너 */}
      <div
        className="relative bg-white dark:bg-neutral-900
                   w-[95vw] h-[90vh] 
                   rounded-2xl shadow-xl flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">{title ?? "Viewer"}</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Close
          </button>
        </div>

        {/* 본문 (스크롤 가능) */}
        <div className="flex-1 overflow-auto p-2">{children}</div>
      </div>
    </div>
  );
}
