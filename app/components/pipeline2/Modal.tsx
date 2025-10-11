"use client";

import React from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  /** Tailwind width class. ex) w-[min(420px,92vw)] */
  maxWidth?: string;
};

export default function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "w-[min(420px,92vw)]",
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-3"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      onMouseDown={(e) => {
        // 바깥 영역 클릭 시 닫기 (원치 않으면 제거)
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className={`${maxWidth} rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200`}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
          <h2 id="modal-title" className="text-sm font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-xs rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
