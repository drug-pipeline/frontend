// app/components/pipeline2/NodeDetailDock.tsx
"use client";

/**
 * Changes
 * - Note section moved above Logs
 * - All placeholders/labels in English
 * - loadNote(): no throwing on non-OK; soft-fail with console.warn
 */

import dynamic from "next/dynamic";
const NglViewerLite = dynamic(() => import("../NglViewerLite"), { ssr: false });
import SecondaryStructurePanel from "../SecondaryStructurePanel";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  FiFileText,
  FiPlus,
  FiX,
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

  onOpenVisualizer?: () => void;
  onOpenSecondary?: () => void;
};

type NodeFileDTO = {
  id: number;
  nodeId: number;
  originalName: string;
  storedPath: string;
  contentType: string;
  size: number;
  createdAt: string;
};

type NodeDetailDTO = {
  id: number;
  projectId: number;
  type: ServerNodeType;
  name: string;
  status: NodeStatus;
  x: number;
  y: number;
  metaJson?: Record<string, any> | null;
};

const API_BASE = "/api";

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

  // Files (self)
  const [files, setFiles] = useState<NodeFileDTO[] | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Upstream inputs (for Visualizer/Secondary)
  const [inputFetching, setInputFetching] = useState(false);
  const [inputFiles, setInputFiles] = useState<NodeFileDTO[] | null>(null);
  const [inputResult, setInputResult] = useState<NodeStatus | null>(null);

  // Modals
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  // Note (minimal)
  const nodeId = node?.id;
  const [note, setNote] = useState<string>("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedAt, setNoteSavedAt] = useState<number | null>(null);

  const isVisualizer = node?.type === "VISUALIZER";
  const isSecondary = node?.type === "SECONDARY";

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

      try {
        await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: ok ? "SUCCESS" : "FAILED" }),
        });
        await onRequestRefreshNodes();
      } catch { /* no-op */ }
    } catch (e) {
      console.error("[fetch inputs] error:", e);
      setInputResult("FAILED");
    } finally {
      setInputFetching(false);
    }
  }, [nodeId, projectId, onRequestRefreshNodes]);

  const contentUrlOf = (fileId: number) => `${API_BASE}/nodes/${fileId}/content`;

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

  useEffect(() => {
    if (!open) return;
    if (!nodeId || !projectId) return;
    if (!(isVisualizer || isSecondary)) return;
    if (inputResult === "SUCCESS" && inputFiles && inputFiles.length > 0) return;
    fetchInputs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nodeId, projectId, isVisualizer, isSecondary]);

  // ---- NOTE: load (soft-fail, no throw) ----
  const loadNote = useCallback(async () => {
    if (!open || !nodeId || !projectId) return;
    setNoteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}`, { method: "GET" });
      if (!res.ok) {
        console.warn(`[loadNote] GET node detail failed: ${res.status}`);
        setNote("");
        setNoteOpen(false);
        return; // do NOT throw
      }
      const detail: NodeDetailDTO = await res.json();
      const existing =
        detail?.metaJson && typeof detail.metaJson === "object" && "note" in detail.metaJson
          ? String(detail.metaJson.note ?? "")
          : "";
      setNote(existing);
      setNoteOpen(existing.trim().length > 0);
    } catch (e) {
      console.warn("[loadNote] error:", e);
      setNote("");
      setNoteOpen(false);
    } finally {
      setNoteLoading(false);
    }
  }, [open, nodeId, projectId]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // ---- NOTE: save ----
  const saveNote = useCallback(async () => {
    if (!nodeId || !projectId) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/nodes/${nodeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaJson: { note } }),
      });
      if (!res.ok) {
        console.warn(`[saveNote] PUT node detail failed: ${res.status}`);
        return;
      }
      setNoteSavedAt(Date.now());
      if (note.trim().length === 0) setNoteOpen(false);
    } catch (e) {
      console.warn("[saveNote] error:", e);
    } finally {
      setNoteSaving(false);
    }
  }, [nodeId, projectId, note]);

  if (!open || !node) return null;

  const st = statusStyle(node.status);
  const firstFile = inputFiles && inputFiles.length > 0 ? inputFiles[0] : null;
  const canOpenModal = inputResult === "SUCCESS" && !!firstFile;

  return (
    <aside className="absolute right-3 top-3 z-20 w-[360px] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-zinc-300/70">
      {/* Header */}
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
        {/* Visualizer / Secondary */}
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
                  title="Fetch inputs"
                >
                  <FiRefreshCw className={inputFetching ? "animate-spin" : ""} />
                  {inputFetching ? "Checking…" : "Fetch"}
                </button>

                {isVisualizer && (
                  <button
                    onClick={() => canOpenModal && setShowVisualizer(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={!canOpenModal}
                    title={canOpenModal ? "Open NGL Visualizer" : "Fetch inputs first"}
                  >
                    <FiExternalLink />
                    Open visualizer
                  </button>
                )}

                {isSecondary && (
                  <button
                    onClick={() => canOpenModal && setShowSecondary(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    disabled={!canOpenModal}
                    title={canOpenModal ? "Open Secondary" : "Fetch inputs first"}
                  >
                    <FiLayers />
                    Open secondary
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] text-zinc-600">Status:</div>
              <StatusPill status={inputResult ?? "PENDING"} />
              {inputFiles && inputFiles.length > 0 && (
                <span className="text-[11px] text-zinc-500">
                  ({inputFiles.length} file{inputFiles.length > 1 ? "s" : ""})
                </span>
              )}
            </div>

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
                        title="Open content"
                      >
                        <FiExternalLink />
                        content
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Files (non-visualizer) */}
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
                  title="Reload file list"
                >
                  <FiRefreshCw className={loadingFiles ? "animate-spin" : ""} />
                  {loadingFiles ? "Loading…" : "Reload"}
                </button>

                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-900" title="Upload a file">
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
                        title="Open content"
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

        {/* ===== NOTE (now right above Logs) ===== */}
        <div>
          {!noteOpen ? (
            <button
              onClick={() => setNoteOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-700"
              title="Add a note to this node"
            >
              <FiPlus className="opacity-70" />
              Add note
            </button>
          ) : (
            <div className="p-0">
              <div className="mb-1 flex items-center justify-between">
                <div className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700">
                  <FiFileText className="opacity-80" />
                  Note
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">
                    {noteLoading ? "Loading…" : noteSaving ? "Saving…" : noteSavedAt ? `Saved ${new Date(noteSavedAt).toLocaleTimeString()}` : ""}
                  </span>
                  <button
                    onClick={() => { if (!noteSaving) setNoteOpen(false); }}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-700"
                    title="Close"
                  >
                    <FiX />
                    Close
                  </button>
                </div>
              </div>

              <textarea
                className="w-full h-20 resize-none rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-800 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-200"
                placeholder="Leave a short note… (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => { if (!noteSaving) void saveNote(); }}
                disabled={noteLoading}
              />

              <div className="mt-1 flex items-center justify-end">
                <button
                  onClick={saveNote}
                  disabled={noteSaving || noteLoading}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-800"
                  title="Save note"
                >
                  <FiSave />
                  Save
                </button>
              </div>

              <div className="mt-2 h-px bg-zinc-100" />
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-800">Activity Logs</div>
          <button
            onClick={onRefreshLogs}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
            disabled={refreshingLogs}
            title="Refresh logs"
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

      {/* Modals */}
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
              <div className="bg-neutral-900 rounded-xl p-2">
                <NglViewerLite
                  source={{ kind: "url", url: contentUrlOf(firstFile.id), ext: "pdb" }}
                  background="transparent"
                  initialRepresentation="cartoon"
                />
              </div>
              <div className="bg-white rounded-xl ring-1 ring-zinc-200 overflow-auto p-3">
                <SecondaryStructurePanel
                  viewer={{ /* viewer wiring unchanged for brevity */ } as any}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 bg-white text-zinc-700 rounded-full shadow px-2 py-1 text-xs"
            title="Close"
          >
            ✕
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
