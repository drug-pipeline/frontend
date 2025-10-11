// app/components/pipeline2/NodeDetailDock.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiRefreshCw,
  FiEdit2,
  FiSave,
  FiUpload,
  FiTrash2,
  FiClock,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiPaperclip,
} from "react-icons/fi";
import { type NodeStatus } from "@/app/components/pipeline2/NodeCard";

/** page.tsx에서 사용하는 최소 필드만 정의 (느슨한 결합) */
export type MinimalNodeDTO = {
  id: number;
  name: string;
  status: NodeStatus;
  type: string; // 서버 enum 문자열 그대로 노출
  x: number;
  y: number;
};

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

/* 상태별 스타일/아이콘 (NodeCard와 UI 일관) */
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.bar} ${s.text} ring-1 ${s.ring}`} title={s.label}>
      <Icon aria-hidden />
      {s.label}
    </span>
  );
}

type Props = {
  open: boolean;
  node: MinimalNodeDTO | null;
  saving: boolean;
  onRename: (newName: string) => void;
  onRefreshLogs: () => void;
  logs: string[] | null;
  refreshingLogs: boolean;
  onReloadDetail: () => void;
  reloadingDetail: boolean;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
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
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [localName, setLocalName] = useState(node?.name ?? "");

  // ---- 파일 목록/업로드 상태 ----
  const [files, setFiles] = useState<NodeFileDTO[] | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const nodeId = node?.id;

  const loadFiles = useCallback(async () => {
    if (!nodeId) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`${API_BASE}/nodes/${nodeId}/files`, { method: "GET" });
      if (!res.ok) throw new Error(`GET /nodes/${nodeId}/files -> ${res.status}`);
      const list: NodeFileDTO[] = await res.json();
      setFiles(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("[Node files] load error:", err);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [nodeId]);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!nodeId) return;
      const arr = Array.from(fileList);
      if (arr.length === 0) return;

      setUploading(true);
      try {
        // 순차 업로드(서버 로그/부하 확인 쉽도록). 병렬 원하면 Promise.all로 변경 가능
        for (const f of arr) {
          const fd = new FormData();
          // 서버에서 @RequestPart("file") 사용하므로 필드명은 반드시 "file"
          fd.append("file", f, f.name);
          const res = await fetch(`${API_BASE}/nodes/${nodeId}/files`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            console.error("[Upload] failed:", f.name, res.status);
            // 하나 실패해도 나머지 진행
          }
        }
        await loadFiles();
      } catch (err) {
        console.error("[Upload] error:", err);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [nodeId, loadFiles]
  );

  // 노드가 바뀌거나 도크가 열리면 파일 목록 새로고침
  useEffect(() => {
    setLocalName(node?.name ?? "");
    setEditMode(false);
    if (open && nodeId) {
      loadFiles();
    } else {
      setFiles(null);
    }
  }, [open, nodeId, node?.name, loadFiles]);

  if (!open || !node) return null;

  return (
    <aside className="pointer-events-auto absolute right-4 top-4 z-[1000] w-[min(380px,92vw)] rounded-2xl bg-white/95 backdrop-blur shadow-xl ring-1 ring-zinc-200">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <div className="flex flex-col">
          <div className="text-xs text-zinc-500">Node Detail</div>
          <div className="mt-0.5 text-sm font-semibold text-zinc-900">
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
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              onClick={() => {
                if (!localName.trim() || localName === node.name) {
                  setEditMode(false);
                  return;
                }
                onRename(localName.trim());
              }}
              title="Save"
            >
              <FiSave />
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="space-y-3 px-4 py-3">
        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Status</div>
            <div className="mt-1">
              <StatusPill status={node.status} />
            </div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Type</div>
            <div className="mt-1 text-xs font-medium text-zinc-700">{node.type}</div>
          </div>
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

        {/* 파일 업로드 + 목록 */}
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
                {loadingFiles ? "Refreshing…" : "Refresh"}
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50">
                <FiUpload />
                {uploading ? "Uploading…" : "Upload"}
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      uploadFiles(e.target.files);
                    }
                  }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* 목록 */}
          {files === null ? (
            <div className="text-[11px] text-zinc-500">Loading…</div>
          ) : files.length === 0 ? (
            <div className="text-[11px] text-zinc-500">No files.</div>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1 text-[11px] ring-1 ring-zinc-200/70"
                  title={f.storedPath}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-zinc-700">{f.originalName}</div>
                    <div className="truncate text-[10px] text-zinc-500">
                      {f.contentType || "unknown"} • {formatBytes(f.size)} • {new Date(f.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {/* 삭제/다운로드 등은 아직 요구 없음. 자리만 남겨둠 */}
                  <div className="ml-2 shrink-0">
                    {/* <button className="inline-flex items-center gap-1 rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] hover:bg-zinc-100">
                      <FiTrash2 /> Remove
                    </button> */}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

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
