// app/components/pipeline2/NodeDetailDock.tsx
"use client";

/**
 * 변경 요약
 * - "Visualizer 보기", "Secondary 보기" 클릭 시 이 컴포넌트 내부 모달에서 바로 렌더링
 * - NGL은 전역 CSS를 쓰지 않는 NglViewerLite로 교체 → 화면 전체 글씨 회색 문제 방지
 * - 기존 onOpenVisualizer/onOpenSecondary prop 없이도 동작하도록 optional 처리
 * - 입력 파일 Fetch → 첫 번째 파일을 /api/nodes/{fileId}/content 로 스트리밍하여 NGL에 로드
 * - 나머지 UI/업로드/로그 등 기존 기능 유지
 */

import dynamic from "next/dynamic";
const NglViewerLite = dynamic(() => import("../NglViewerLite"), { ssr: false });
import SecondaryStructurePanel from "../SecondaryStructurePanel";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiRefreshCw,
  FiEdit2,
  FiSave,
  FiUpload,
  FiClock,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiPaperclip,
  FiDownloadCloud,
  FiExternalLink,
  FiLayers,
} from "react-icons/fi";

export type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type ServerNodeType =
  | "PDB"
  | "COMPOUND"
  | "VISUALIZER"
  | "SECONDARY"
  | "DISTANCE_MAP"
  | "ADMET"
  | "UNIPROT_INFO"
  | "PDB_INFO";

export type MinimalNodeDTO = {
  id: number;
  projectId: number;
  type: ServerNodeType;
  name: string;
  status: NodeStatus;
  x: number;
  y: number;
};

type Props = {
  open: boolean;
  node: MinimalNodeDTO | null;
  saving: boolean;
  onRename: (name: string) => Promise<void>;
  onRefreshLogs: () => Promise<void>;
  logs: string[] | null;
  refreshingLogs: boolean;

  onReloadDetail: () => Promise<void>;
  reloadingDetail: boolean;

  projectId: number | null;

  onRequestRefreshNodes: () => Promise<void>;

  /** 기존 코드 호환용(사용 안해도 동작). */
  onOpenVisualizer?: () => void;
  onOpenSecondary?: () => void;
};

/** 업로드/파일 DTO */
type NodeFileDTO = {
  id: number;
  nodeId: number;
  originalName: string;
  storedPath: string;
  contentType: string;
  size: number;
  createdAt: string; // ISO
};

const API_BASE = "/api";

/** 상태 뱃지 스타일 */
const statusStyle = (status: NodeStatus) => {
  switch (status) {
    case "PENDING":
      return { bar: "bg-amber-50", dot: "bg-amber-400", text: "text-amber-700", ring: "ring-amber-200", Icon: FiClock, label: "Pending" };
    case "RUNNING":
      return { bar: "bg-blue-50", dot: "bg-blue-500", text: "text-blue-700", ring: "ring-blue-200", Icon: FiActivity, label: "Running" };
    case "SUCCESS":
      return { bar: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", Icon: FiCheckCircle, label: "Success" };
    case "FAILED":
    default:
      return { bar: "bg-rose-50", dot: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200", Icon: FiXCircle, label: "Failed" };
  }
};

function StatusPill({ status }: { status: NodeStatus }) {
  const s = statusStyle(status);
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bar} ${s.text} ring-1 ${s.ring}`} title={s.label}>
      <Icon aria-hidden />
      {s.label}
    </span>
  );
}

export default function NodeDetailDock({
  open,
  node,
  saving,
  onRename,
  onRefreshLogs,
  logs,
  refreshingLogs,
  onReloadDetail,
  reloadingDetail,
  projectId,
  onRequestRefreshNodes,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [localName, setLocalName] = useState(node?.name ?? "");

  // 일반 노드 파일 목록/업로드
  const [files, setFiles] = useState<NodeFileDTO[] | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 시각화용 입력 파일(Visualizer/Secondary 공통)
  const [inputFetching, setInputFetching] = useState(false);
  const [inputFiles, setInputFiles] = useState<NodeFileDTO[] | null>(null);
  const [inputResult, setInputResult] = useState<NodeStatus | null>(null); // SUCCESS / FAILED

  // 모달 상태(내부 구현으로 변경)
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  const nodeId = node?.id;
  const isVisualizer = node?.type === "VISUALIZER";
  const isSecondary = node?.type === "SECONDARY";

  const [secStage, setSecStage] = useState<any>(null);
const [secComp, setSecComp] = useState<any>(null);
const [secDefaultRep, setSecDefaultRep] = useState<any>(null);
const [secHighlightRep, setSecHighlightRep] = useState<any>(null);
const [secLastSele, setSecLastSele] = useState<string | null>(null);


  /** 자기 자신의 파일 목록 가져오기 (PDB 등 일반 노드) */
  const loadFiles = useCallback(async () => {
    if (!nodeId) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`${API_BASE}/nodes/${nodeId}/files`, { method: "GET" });
      if (!res.ok) throw new Error(String(res.status));
      const data: NodeFileDTO[] = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[Load files] error:", err);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [nodeId]);

  /** 업로드 후 PDB 노드는 SUCCESS로 표시 */
  const markPdbSuccess = useCallback(async () => {
    if (!projectId || !nodeId) return;
    try {
      await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUCCESS" }),
      });
      await onRequestRefreshNodes();
    } catch (e) {
      console.error("[PUT node SUCCESS] err:", e);
    }
  }, [projectId, nodeId, onRequestRefreshNodes]);

  /** 파일 업로드 */
  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !nodeId) return;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/nodes/${nodeId}/files`, { method: "POST", body: fd });
        if (!res.ok) throw new Error(String(res.status));
        await loadFiles();
        if (node?.type === "PDB") {
          await markPdbSuccess();
        }
      } catch (err) {
        console.error("[Upload] error:", err);
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [nodeId, node?.type, loadFiles, markPdbSuccess]
  );

  /** 시각화 입력 파일 fetch (Visualizer/Secondary 공통) */
  const fetchInputs = useCallback(async () => {
    if (!nodeId || !projectId) return;
    setInputFetching(true);
    setInputResult(null);
    setInputFiles(null);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}/inputs`, { method: "GET" });
      if (!res.ok) {
        setInputResult("FAILED");
        return;
      }
      const arr: NodeFileDTO[] = await res.json();
      const ok = Array.isArray(arr) && arr.length > 0;
      setInputFiles(ok ? arr : []);
      setInputResult(ok ? "SUCCESS" : "FAILED");

      // (선택) 노드 상태 동기화
      try {
        await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: ok ? "SUCCESS" : "FAILED" }),
        });
        await onRequestRefreshNodes();
      } catch { }
    } catch (e) {
      console.error("[fetch inputs] error:", e);
      setInputResult("FAILED");
    } finally {
      setInputFetching(false);
    }
  }, [nodeId, projectId, onRequestRefreshNodes]);

  /** 파일 컨텐츠 스트리밍 URL */
  const contentUrlOf = useCallback((fileId: number) => `${API_BASE}/nodes/${fileId}/content`, []);

  /** 이름 변경 저장 */
  const saveRename = useCallback(async () => {
    if (!node || !localName.trim()) return;
    try {
      await onRename(localName.trim());
      setEditMode(false);
    } catch (e) {
      console.error(e);
    }
  }, [node, localName, onRename]);

  useEffect(() => setLocalName(node?.name ?? ""), [node?.name]);

  if (!open || !node) return null;

  const st = statusStyle(node.status);
  const firstFile = inputFiles && inputFiles.length > 0 ? inputFiles[0] : null;
  const canOpenModal = inputResult === "SUCCESS" && !!firstFile;

  return (
    <aside className="absolute right-3 top-3 z-20 w-[360px] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-zinc-300/70">
      {/* 헤더 */}
      <div className="border-b border-zinc-200 bg-zinc-50/60 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <div className={`h-2 w-2 rounded-full ${st.dot}`} />
            {editMode ? (
              <input
                className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                maxLength={120}
                placeholder="Node name"
                autoFocus
              />
            ) : (
              node.name || "(untitled)"
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReloadDetail}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
              title="서버 최신 내용으로 갱신"
              disabled={reloadingDetail}
            >
              <FiRefreshCw className={reloadingDetail ? "animate-spin" : ""} />
              {reloadingDetail ? "Syncing…" : "Reload"}
            </button>

            {!editMode ? (
              <button
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                onClick={() => setEditMode(true)}
                title="이름 변경"
              >
                <FiEdit2 />
                Rename
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={saveRename}
                disabled={saving}
                title="이름 저장"
              >
                <FiSave />
                Save
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <StatusPill status={node.status} />
          <div className="text-[11px] text-zinc-500">{node.type}</div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {/* 메타 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Node ID</div>
            <div className="mt-1 text-xs font-medium text-zinc-700">{node.id}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Position</div>
            <div className="mt-1 text-xs font-medium text-zinc-700">
              x: {node.x}, y: {node.y}
            </div>
          </div>
        </div>

        {/* VISUALIZER / SECONDARY : 입력 Fetch + 보기 버튼 */}
        {(isVisualizer || isSecondary) && (
          <div className="rounded-lg border border-zinc-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-800">
                <FiDownloadCloud />
                Inputs (from upstream PDB)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchInputs}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50 disabled:opacity-60"
                  disabled={inputFetching || !projectId}
                  title="입력 파일 조회"
                >
                  <FiRefreshCw className={inputFetching ? "animate-spin" : ""} />
                  {inputFetching ? "Checking…" : "Fetch"}
                </button>

                {isVisualizer && (
                  <button
                    onClick={() => canOpenModal && setShowVisualizer(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={!canOpenModal}
                    title={canOpenModal ? "NGL Visualizer 열기" : "먼저 입력을 가져오세요"}
                  >
                    <FiExternalLink />
                    Visualizer 보기
                  </button>
                )}

                {isSecondary && (
                  <button
                    onClick={() => canOpenModal && setShowSecondary(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    disabled={!canOpenModal}
                    title={canOpenModal ? "Secondary 보기" : "먼저 입력을 가져오세요"}
                  >
                    <FiLayers />
                    Secondary 보기
                  </button>
                )}
              </div>
            </div>

            {/* 결과 상태 */}
            <div className="flex items-center gap-2">
              <div className="text-[11px] text-zinc-600">Status:</div>
              <StatusPill status={inputResult ?? "PENDING"} />
              {inputFiles && inputFiles.length > 0 && (
                <span className="text-[11px] text-zinc-500">
                  ({inputFiles.length} file{inputFiles.length > 1 ? "s" : ""})
                </span>
              )}
            </div>

            {/* 파일 리스트 */}
            {inputFiles && inputFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {inputFiles.map((f) => (
                  <li key={f.id} className="rounded-md border border-zinc-200 px-2 py-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="truncate text-zinc-800" title={f.originalName}>
                        {f.originalName}
                      </div>
                      <a
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                        href={contentUrlOf(f.id)}
                        target="_blank"
                        rel="noreferrer"
                        title="바로 열기/다운로드"
                      >
                        <FiExternalLink />
                        content
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
              입력 파일 중 첫 번째 파일을 NGL에 로드합니다. 스트리밍 엔드포인트:
              <code> /api/nodes/{"{fileId}"}/content</code>
            </p>
          </div>
        )}

        {/* 일반 노드(PDB 등) 파일 업로드/목록 */}
        {!isVisualizer && !isSecondary && (
          <div className="rounded-lg border border-zinc-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-800">
                <FiPaperclip />
                Files
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadFiles}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50 disabled:opacity-60"
                  disabled={loadingFiles}
                  title="파일 목록 새로고침"
                >
                  <FiRefreshCw className={loadingFiles ? "animate-spin" : ""} />
                  {loadingFiles ? "Loading…" : "Reload"}
                </button>

                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-900">
                  <FiUpload />
                  Upload
                  <input ref={inputRef} onChange={onUpload} type="file" className="hidden" />
                </label>
              </div>
            </div>

            {files && files.length > 0 ? (
              <ul className="space-y-1">
                {files.map((f) => (
                  <li key={f.id} className="rounded-md border border-zinc-200 px-2 py-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="truncate text-zinc-800" title={f.originalName}>
                        {f.originalName}
                      </div>
                      <a
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                        href={contentUrlOf(f.id)}
                        target="_blank"
                        rel="noreferrer"
                        title="바로 열기/다운로드"
                      >
                        <FiExternalLink />
                        content
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[11px] text-zinc-500">No files.</div>
            )}
          </div>
        )}

        {/* 로그 */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-800">Activity Logs</div>
          <button
            onClick={onRefreshLogs}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
            title="로그 새로고침"
            disabled={refreshingLogs}
          >
            <FiRefreshCw className={refreshingLogs ? "animate-spin" : ""} />
            {refreshingLogs ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="max-h-[220px] overflow-auto rounded-lg bg-zinc-50 p-2 text-[11px] leading-relaxed ring-1 ring-zinc-200/70">
          {logs && logs.length > 0 ? (
            <pre className="whitespace-pre-wrap text-zinc-700">{logs.join("\n")}</pre>
          ) : (
            <div className="text-zinc-500">No logs.</div>
          )}
        </div>
      </div>

      {/* ===== 모달 (내부 구현) : 전역 CSS 없이 안전 ===== */}
      {showVisualizer && firstFile && (
        <Modal onClose={() => setShowVisualizer(false)}>
          <div className="w-[980px] h-[640px] bg-neutral-900 rounded-2xl p-3">
            <NglViewerLite
              source={{ kind: "url", url: contentUrlOf(firstFile.id), ext: "pdb" }}
              background="transparent"
              initialRepresentation="cartoon"
            />
          </div>
        </Modal>
      )}

      {showSecondary && firstFile && (
  <Modal onClose={() => setShowSecondary(false)}>
    <div className="w-[1080px] h-[680px] bg-white rounded-2xl p-3">
      <div className="grid grid-cols-2 gap-3 h-full">
        {/* 좌: NGL */}
        <div className="bg-neutral-900 rounded-xl p-2">
          <NglViewerLite
            source={{ kind: "url", url: contentUrlOf(firstFile.id), ext: "pdb" }}
            background="transparent"
            initialRepresentation="cartoon"
            onReady={(stage, component, defaultRep) => {
              setSecStage(stage);
              setSecComp(component);
              setSecDefaultRep(defaultRep ?? null);
            }}
          />
        </div>

        {/* 우: Secondary (viewer 주입) */}
        <div className="bg-white rounded-xl ring-1 ring-zinc-200 overflow-auto p-3">
          <SecondaryStructurePanel
            viewer={{
              stage: secStage,
              component: secComp,
              defaultRep: secDefaultRep,
              setDefaultRep: setSecDefaultRep,
              highlightRep: secHighlightRep,
              setHighlightRep: setSecHighlightRep,
              lastSele: secLastSele,
              setLastSele: setSecLastSele,
            }}
          />
        </div>
      </div>
    </div>
  </Modal>
)}



    </aside>
  );
}

/** 전역 CSS에 의존하지 않는 최소 모달 */
function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 bg-white text-zinc-700 rounded-full shadow px-2 py-1 text-xs"
            title="닫기"
          >
            ✕
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
