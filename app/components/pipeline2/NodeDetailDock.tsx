// app/components/pipeline2/NodeDetailDock.tsx
"use client";

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
  onOpenVisualizer: () => void;
  onOpenSecondary: () => void;
};

/* 업로드/파일 DTO */
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

/* 상태별 스타일/아이콘 */
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
  onOpenVisualizer,
  onOpenSecondary,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [localName, setLocalName] = useState(node?.name ?? "");

  // ---- 파일 목록/업로드 상태 (PDB 등 일반 노드에서만 사용) ----
  const [files, setFiles] = useState<NodeFileDTO[] | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ---- 시각화 입력 fetch 상태 (Visualizer/Secondary 공통) ----
  const [inputFetching, setInputFetching] = useState(false);
  const [inputFiles, setInputFiles] = useState<NodeFileDTO[] | null>(null);
  const [inputResult, setInputResult] = useState<NodeStatus | null>(null); // SUCCESS / FAILED

  const nodeId = node?.id;
  const isVisualizer = node?.type === "VISUALIZER";
  const isSecondary = node?.type === "SECONDARY";

  /** 일반 노드: 자기 자신의 파일 목록 */
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

  /** 일반 노드: 파일 업로드 */
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

  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !nodeId) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/nodes/${nodeId}/files`, { method: "POST", body: fd });
        if (!res.ok) throw new Error(String(res.status));
        await loadFiles();
        // 업로드 성공 시 PDB 노드는 SUCCESS로
        if (node?.type === "PDB") {
          await markPdbSuccess();
        }
      } catch (err) {
        console.error("[Upload] error:", err);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [nodeId, node?.type, loadFiles, markPdbSuccess]
  );

  /** 시각화/세컨더리: 입력(fetch) */
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

      // 노드 상태 반영(선택)
      try {
        await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: ok ? "SUCCESS" : "FAILED" }),
        });
        await onRequestRefreshNodes();
      } catch {}
    } catch (e) {
      console.error("[fetch inputs] error:", e);
      setInputResult("FAILED");
    } finally {
      setInputFetching(false);
    }
  }, [nodeId, projectId, onRequestRefreshNodes]);

  /** 파일 스트리밍 URL */
  const contentUrlOf = useCallback((fileId: number) => `${API_BASE}/nodes/${fileId}/content`, []);

  /** 이름 변경 */
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

  return (
    <aside className="absolute right-3 top-3 z-20 w-[360px] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-zinc-300/70">
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
              title="Reload latest from server"
              disabled={reloadingDetail}
            >
              <FiRefreshCw className={reloadingDetail ? "animate-spin" : ""} />
              {reloadingDetail ? "Syncing…" : "Reload"}
            </button>

            {!editMode ? (
              <button
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                onClick={() => setEditMode(true)}
                title="Rename"
              >
                <FiEdit2 />
                Rename
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={saveRename}
                disabled={saving}
                title="Save name"
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

        {/* ▼▼ VISUALIZER / SECONDARY : 입력 fetch + 버튼 ▼▼ */}
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
                  title="Fetch input files"
                >
                  <FiRefreshCw className={inputFetching ? "animate-spin" : ""} />
                  {inputFetching ? "Checking…" : "Fetch"}
                </button>

                {/* 보기 버튼들 */}
                {isVisualizer && (
                  <button
                    onClick={() => {
                      if (!inputFiles || inputFiles.length === 0) return;
                      const url = contentUrlOf(inputFiles[0].id);
                      try { if (typeof window !== "undefined") sessionStorage.setItem("ngl.pdbUrl", url); } catch {}
                      onOpenVisualizer();
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={inputResult !== "SUCCESS" || !inputFiles || inputFiles.length === 0}
                    title={inputResult === "SUCCESS" ? "Open NGL Visualizer" : "Fetch inputs first"}
                  >
                    <FiExternalLink />
                    Visualizer 보기
                  </button>
                )}

                {isSecondary && (
                  <button
                    onClick={() => {
                      if (!inputFiles || inputFiles.length === 0) return;
                      const url = contentUrlOf(inputFiles[0].id);
                      try { if (typeof window !== "undefined") sessionStorage.setItem("ngl.pdbUrl", url); } catch {}
                      onOpenSecondary();
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    disabled={inputResult !== "SUCCESS" || !inputFiles || inputFiles.length === 0}
                    title={inputResult === "SUCCESS" ? "Open NGL + Secondary" : "Fetch inputs first"}
                  >
                    <FiLayers />
                    Secondary 보기
                  </button>
                )}
              </div>
            </div>

            {/* 결과 상태 표시 */}
            <div className="flex items-center gap-2">
              <div className="text-[11px] text-zinc-600">Status:</div>
              <StatusPill status={inputResult ?? "PENDING"} />
              {inputFiles && inputFiles.length > 0 && (
                <span className="text-[11px] text-zinc-500">({inputFiles.length} file{inputFiles.length > 1 ? "s" : ""})</span>
              )}
            </div>

            {/* 파일 리스트 미리보기 */}
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
                        title="Download/Preview"
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
              백엔드가 반환하는 입력 파일 중 첫 번째 파일을 NGL에서 엽니다.
              파일 스트리밍 엔드포인트: <code>/api/nodes/{"{fileId}"}/content</code>
            </p>
          </div>
        )}

        {/* ▼▼ 일반 노드(PDB 등) 파일 업로드/목록 ▼▼ */}
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
                  title="Refresh file list"
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
                        title="Download/Preview"
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
            title="Refresh logs"
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
    </aside>
  );
}
