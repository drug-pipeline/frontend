// components/InteractionPanel.tsx
"use client";

import React from "react";
import {
  TablePane,
  Mode,
  AtomRow,
  ResidueRow,
  TypeColor,
} from "./Interaction/Table";
import { GraphPane } from "./Interaction/Graph";
import { useNgl } from "./NglContext";

/* ============ Types for graphs ============ */
export type GraphNode = {
  id: string;
  label: string;
  role: string; // 'A' | 'R' | other chain letters
};

export type GraphLink = {
  source: string;
  target: string;
  type?: string;
  distance?: number;
  angle?: number;
};

export type GraphPayload = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type FetchSummary = { nodes: number; links: number };

/* ============ Debug switches ============ */
const DEBUG_JSON_LOG = true;
const DEBUG_SAMPLE = 5;

/* ============ Consts ============ */
const PDB_ID = "test";

const INTERACTION_TYPES = [
  "clash",
  "covalent",
  "vdw_clash",
  "vdw",
  "proximal",
  "hbond",
  "weak_hbond",
  "halogen_bond",
  "ionic",
  "metal_complex",
  "aromatic",
  "hydrophobic",
  "carbonyl",
  "polar",
  "weak_polar",
] as const;

type InteractionType = (typeof INTERACTION_TYPES)[number];

/** distance 라인 색상 (HEX) */
const TYPE_HEX: Record<InteractionType, string> = {
  clash: "#e11d48",
  covalent: "#d97706",
  vdw_clash: "#a21caf",
  vdw: "#0284c7",
  proximal: "#65a30d",
  hbond: "#2563eb",
  weak_hbond: "#4338ca",
  halogen_bond: "#0891b2",
  ionic: "#059669",
  metal_complex: "#0d9488",
  aromatic: "#7e22ce",
  hydrophobic: "#ea580c",
  carbonyl: "#b45309",
  polar: "#334155",
  weak_polar: "#3f3f46",
};

const TYPE_COLORS: Record<
  InteractionType,
  { bg: string; text: string; ring: string; hover: string }
> = {
  clash: {
    bg: "bg-rose-600",
    text: "text-white",
    ring: "ring-rose-700",
    hover: "hover:bg-rose-700",
  },
  covalent: {
    bg: "bg-amber-600",
    text: "text-white",
    ring: "ring-amber-700",
    hover: "hover:bg-amber-700",
  },
  vdw_clash: {
    bg: "bg-fuchsia-600",
    text: "text-white",
    ring: "ring-fuchsia-700",
    hover: "hover:bg-fuchsia-700",
  },
  vdw: {
    bg: "bg-sky-600",
    text: "text-white",
    ring: "ring-sky-700",
    hover: "hover:bg-sky-700",
  },
  proximal: {
    bg: "bg-lime-600",
    text: "text-white",
    ring: "ring-lime-700",
    hover: "hover:bg-lime-700",
  },
  hbond: {
    bg: "bg-blue-600",
    text: "text-white",
    ring: "ring-blue-700",
    hover: "hover:bg-blue-700",
  },
  weak_hbond: {
    bg: "bg-indigo-600",
    text: "text-white",
    ring: "ring-indigo-700",
    hover: "hover:bg-indigo-700",
  },
  halogen_bond: {
    bg: "bg-cyan-600",
    text: "text-white",
    ring: "ring-cyan-700",
    hover: "hover:bg-cyan-700",
  },
  ionic: {
    bg: "bg-emerald-600",
    text: "text-white",
    ring: "ring-emerald-700",
    hover: "hover:bg-emerald-700",
  },
  metal_complex: {
    bg: "bg-teal-600",
    text: "text-white",
    ring: "ring-teal-700",
    hover: "hover:bg-teal-700",
  },
  aromatic: {
    bg: "bg-purple-600",
    text: "text-white",
    ring: "ring-purple-700",
    hover: "hover:bg-purple-700",
  },
  hydrophobic: {
    bg: "bg-orange-600",
    text: "text-white",
    ring: "ring-orange-700",
    hover: "hover:bg-orange-700",
  },
  carbonyl: {
    bg: "bg-amber-700",
    text: "text-white",
    ring: "ring-amber-800",
    hover: "hover:bg-amber-800",
  },
  polar: {
    bg: "bg-slate-700",
    text: "text-white",
    ring: "ring-slate-800",
    hover: "hover:bg-slate-800",
  },
  weak_polar: {
    bg: "bg-zinc-700",
    text: "text-white",
    ring: "ring-zinc-800",
    hover: "hover:bg-zinc-800",
  },
};

/* ============ CSV/Row helpers kept (Table/Graph) ============ */
function buildAtomSele(rows: Array<{ Atom1: string; Atom2: string }>): string | null {
  const sels = new Set<string>();
  const pushSerial = (label: string) => {
    const parts = label.trim().split("/").map((s) => s.trim());
    const serial = parts[4]; // "R/153/SER/OG/76" 형태에서 마지막이 serial
    if (serial && /^\d+$/.test(serial)) sels.add(`@${serial}`);
  };
  for (const r of rows) {
    pushSerial(r.Atom1);
    pushSerial(r.Atom2);
  }
  if (sels.size === 0) return null;
  const sele = Array.from(sels).join(" or ");
  console.log("[NGL rows->atom sele] count =", sels.size);
  return sele;
}

/* keep color resolver for Table.tsx */
function getTypeColor(t: string): TypeColor | null {
  const m = (TYPE_COLORS as Record<string, TypeColor | undefined>)[t];
  return m ?? null;
}

/* ============ utils ============ */
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function to3(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return n.toFixed(3);
}
function firstAlpha(s: string) {
  const m = s.match(/[A-Za-z]/);
  return m ? m[0] : "";
}
function getNodeLabelByRef(payload: GraphPayload, ref: string) {
  const byId = payload.nodes.find((n) => n.id === ref)?.label;
  if (byId) return byId;
  const idx = Number(ref);
  if (Number.isInteger(idx) && idx >= 0 && idx < payload.nodes.length)
    return payload.nodes[idx].label;
  return ref;
}
function sample<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, Math.min(n, arr.length)));
}

/** 그래프 JSON을 최대한 관대하게 정규화 (Table/Graph 유지용) */
function normalizeGraph(raw: unknown): GraphPayload {
  const nodesRaw = isObj(raw) ? (raw["nodes"] as unknown) : null;
  const linksRaw = isObj(raw) ? (raw["links"] as unknown) : null;

  const rawNodesArr = Array.isArray(nodesRaw)
    ? nodesRaw
    : isObj(nodesRaw)
    ? Object.values(nodesRaw as Record<string, unknown>)
    : [];

  const nodes: GraphNode[] = rawNodesArr
    .map((n) => (isObj(n) ? n : null))
    .filter((x): x is Record<string, unknown> => x !== null)
    .map((n, i) => {
      const label = String(
        typeof n["label"] === "string" || typeof n["label"] === "number"
          ? n["label"]
          : typeof n["id"] === "string" || typeof n["id"] === "number"
          ? n["id"]
          : i
      );
      const id = String(
        typeof n["id"] === "string" || typeof n["id"] === "number" ? n["id"] : i
      );
      return { id, label, role: firstAlpha(label) };
    });

  let rawLinksArr: unknown[] = [];
  if (Array.isArray(linksRaw)) {
    rawLinksArr = linksRaw;
  } else if (isObj(linksRaw)) {
    const dict = linksRaw as Record<string, unknown>;
    const preferred = (dict as Record<string, unknown>)["A-R"];
    rawLinksArr = Array.isArray(preferred)
      ? (preferred as unknown[])
      : Object.values(dict).flatMap((v) => (Array.isArray(v) ? v : []));
  }

  const links: GraphLink[] = rawLinksArr
    .map((l) => (isObj(l) ? l : null))
    .filter((x): x is Record<string, unknown> => x !== null)
    .map((l) => ({
      source: String(
        typeof l["source"] === "string" || typeof l["source"] === "number"
          ? l["source"]
          : ""
      ),
      target: String(
        typeof l["target"] === "string" || typeof l["target"] === "number"
          ? l["target"]
          : ""
      ),
      type: typeof l["type"] === "string" ? (l["type"] as string) : undefined,
      distance:
        typeof l["distance"] === "number"
          ? (l["distance"] as number)
          : typeof l["distance"] === "string"
          ? parseFloat(l["distance"] as string)
          : undefined,
      angle:
        typeof l["angle"] === "number"
          ? (l["angle"] as number)
          : typeof l["angle"] === "string"
          ? parseFloat(l["angle"] as string)
          : undefined,
    }))
    .filter((l) => l.source !== "" && l.target !== "");

  return { nodes, links };
}

/* ============ Rows builders (Table/Graph용 유지) ============ */
function buildAtomRows(payload: GraphPayload): AtomRow[] {
  return payload.links.map((l) => {
    const a1 = getNodeLabelByRef(payload, l.source);
    const a2 = getNodeLabelByRef(payload, l.target);
    const angleDisplay =
      l.angle === undefined || l.angle === 0 ? "-" : to3(l.angle);
    return {
      Atom1: a1,
      Atom2: a2,
      "Interaction Type": l.type ?? "-",
      "Distance(Å)": to3(l.distance),
      "Angle(°)": angleDisplay,
    };
  });
}

function buildResidueRowsFromPayload(payload: GraphPayload): ResidueRow[] {
  const pairs = payload.links.map((l) => ({
    a1: getNodeLabelByRef(payload, l.source),
    a2: getNodeLabelByRef(payload, l.target),
    type: l.type ?? "-",
  }));
  const map = new Map<string, number>();
  for (const p of pairs) {
    const key = `${p.a1}__${p.a2}__${p.type}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const rows: ResidueRow[] = Array.from(map.entries()).map(([k, cnt]) => {
    const [a1, a2, typ] = k.split("__");
    return { Count: cnt, Atom1: a1, Atom2: a2, "Interaction Type": typ };
  });
  rows.sort((a, b) => b.Count - a.Count || a.Atom1.localeCompare(b.Atom1));
  return rows;
}

/* ============ Graph helpers (Table/Graph용 유지) ============ */
function filterPayloadByTypes(
  base: GraphPayload,
  active: Set<string>
): GraphPayload {
  if (active.size === 0) return { nodes: [], links: [] };
  const links = base.links.filter((l) => (l.type ? active.has(l.type) : false));
  const nodeSet = new Set<string>();
  for (const l of links) {
    nodeSet.add(String(l.source));
    nodeSet.add(String(l.target));
  }
  const nodes = base.nodes.filter(
    (n) => nodeSet.has(n.id) || nodeSet.has(String(base.nodes.indexOf(n)))
  );
  return { nodes, links };
}

/* ============ Filter Pane (보존) ============ */
type FilterPaneProps = {
  mode: Mode;
  setMode: (m: Mode) => void;
  selectedTypes: Record<string, boolean>;
  onToggleType: (typ: string) => void;
  onSetAll: (checked: boolean) => void;
  countsByType: Record<string, number>;
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
      {children}
    </span>
  );
}

function TypePill({
  type,
  active,
  onToggle,
  count,
}: {
  type: string;
  active: boolean;
  onToggle: () => void;
  count: number;
}) {
  const c = getTypeColor(type);
  const base =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 transition-colors";
  const inactive =
    "bg-zinc-100 text-zinc-500 ring-zinc-300 hover:bg-zinc-200 cursor-pointer";
  const activeCls = c
    ? `${c.bg} ${c.text} ${c.ring} ${c.hover} cursor-pointer`
    : "bg-slate-600 text-white ring-slate-700 hover:bg-slate-700";

  const disabled = count === 0;
  const disabledCls = "opacity-50 pointer-events-none cursor-default";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onToggle();
        console.log("[UI] toggle type:", type, "->", !active);
      }}
      className={[
        base,
        active ? activeCls : inactive,
        disabled ? disabledCls : "",
      ].join(" ")}
      title={disabled ? `${type} (0)` : type}
      aria-disabled={disabled}
    >
      <span className="font-medium">{type}</span>
      <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] leading-none text-black">
        {count}
      </span>
    </button>
  );
}

function FilterPane({
  mode,
  setMode,
  selectedTypes,
  onToggleType,
  onSetAll,
  countsByType,
}: FilterPaneProps) {
  const selectable = INTERACTION_TYPES.filter(
    (t) => (countsByType[t] ?? 0) > 0
  );
  const all =
    selectable.length > 0 && selectable.every((t) => !!selectedTypes[t]);
  const none = selectable.every((t) => !selectedTypes[t]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-800">Mode</span>
        <div
          role="tablist"
          aria-label="Mode"
          className="inline-flex rounded-xl bg-zinc-100 p-1 shadow-inner ring-1 ring-zinc-200"
        >
          {(["atom", "residue"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMode(m);
                  console.log("[UI] set mode:", m);
                }}
                className={[
                  "px-3 py-1.5 text-xs rounded-lg transition-colors",
                  active
                    ? "bg-white text-zinc-900 shadow ring-1 ring-zinc-200"
                    : "text-zinc-600 hover:text-zinc-800",
                ].join(" ")}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-800">Types</span>
        <button
          onClick={() => {
            onSetAll(true);
            console.log("[UI] Select All clicked");
          }}
          disabled={all}
          className={[
            "rounded-md border px-2 py-1 text-xs transition-colors",
            all
              ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60"
              : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
          ].join(" ")}
        >
          Select All
        </button>
        <button
          onClick={() => {
            onSetAll(false);
            console.log("[UI] Clear clicked");
          }}
          disabled={none}
          className={[
            "rounded-md border px-2 py-1 text-xs transition-colors",
            none
              ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60"
              : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
          ].join(" ")}
        >
          Clear
        </button>

        <Badge>{all ? "All" : none ? "None" : "Custom"}</Badge>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-2">
        <div className="flex flex-wrap gap-1">
          {INTERACTION_TYPES.map((t) => (
            <TypePill
              key={t}
              type={t}
              active={!!selectedTypes[t]}
              onToggle={() => onToggleType(t)}
              count={countsByType[t] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ NGL helpers (type-safe, using global NGL types) ============ */
type NglAddRepFn = (name: string, params?: Record<string, unknown>) => NGL.Representation;
type NglComponentLike = { addRepresentation: NglAddRepFn };

function isRep(obj: unknown): obj is NGL.Representation {
  if (!isObj(obj)) return false;
  const rec = obj as Record<string, unknown>;
  return typeof rec.dispose === "function" && typeof rec.setParameters === "function";
}
function addRepSafe(
  component: unknown,
  name: string,
  params: Record<string, unknown>
): NGL.Representation | null {
  if (
    component &&
    typeof (component as Record<string, unknown>).addRepresentation === "function"
  ) {
    const rep = (component as NglComponentLike).addRepresentation(name, params);
    return isRep(rep) ? rep : null;
  }
  return null;
}
function disposeSafe(rep: unknown) {
  if (isRep(rep)) {
    try {
      rep.dispose();
    } catch (e) {
      console.log("[NGL] dispose error:", e);
    }
  }
}

/* ============ NEW: NGL 전용 JSON 타입/파서 ============ */
/** JSON 한 쌍: [label1, label2, distance, angle] */
type JsonPair = [string, string, number | string, number | string];
/** 타입 → 체인쌍("A-A","A-R","B-C"...) → JsonPair[] */
type NglInteractionJson = Partial<Record<InteractionType, Record<string, JsonPair[]>>>;

/** "237:A.O:ASP:861" 같은 라벨을 최소 파싱(그대로 출력 컨셉) */
function parseJsonLabel(s: string): {
  serial?: string;
  chain?: string;
  resno?: string;
  atomName?: string;
  resName?: string;
} {
  const raw = String(s);
  const parts = raw.split(":"); // e.g., ["237", "A.O", "ASP", "861"]
  let serial: string | undefined;
  let chain: string | undefined;
  let atomName: string | undefined;
  let resName: string | undefined;
  let resno: string | undefined;

  if (parts.length >= 4) {
    if (/^\d+$/.test(parts[0] ?? "")) serial = parts[0];
    const chainAtom = parts[1] ?? "";
    const ca = chainAtom.split(".");
    if (ca.length >= 1 && ca[0]) chain = ca[0];
    if (ca.length >= 2 && ca[1]) atomName = ca[1];
    resName = parts[2] ?? undefined;
    if (/^\d+$/.test(parts[3] ?? "")) resno = parts[3];
  } else {
    // 비표준 포맷 대응 (fallback)
    const m = raw.match(/(?:(\d+):)?([A-Za-z0-9])\.?([A-Za-z0-9]+)?[:/]?([A-Za-z]{1,3})?:?(\d+)?/);
    if (m) {
      serial = m[1] ?? undefined;
      chain = m[2] ?? undefined;
      atomName = m[3] ?? undefined;
      resName = m[4] ?? undefined;
      resno = m[5] ?? undefined;
    }
  }

  if (DEBUG_JSON_LOG) {
    console.log("[parseJsonLabel]", {
      input: raw,
      parsed: { serial, chain, atomName, resName, resno },
    });
  }
  return { serial, chain, resno, atomName, resName };
}

/** JSON → residue sele (활성 타입만) */
function buildResidueSeleFromJson(
  data: NglInteractionJson | null,
  active: Set<string>
): string | null {
  if (!data) return null;
  if (active.size === 0) {
    console.log("[NGL json] residue sele skipped (no active types)");
    return null;
  }
  const sels = new Set<string>();
  let added = 0;
  let missing = 0;

  for (const [typ, byChain] of Object.entries(data)) {
    if (!active.has(typ)) continue;
    if (!byChain) continue;
    let perTypeAdded = 0;
    let perTypeMissing = 0;

    for (const [cg, pairs] of Object.entries(byChain)) {
      const perChainAddedBefore = added;
      for (const [la, lb] of pairs) {
        const a = parseJsonLabel(la);
        const b = parseJsonLabel(lb);
        if (a.chain && a.resno) {
          sels.add(`:${a.chain} and resi ${a.resno}`);
          added++;
          perTypeAdded++;
        } else {
          missing++;
          perTypeMissing++;
        }
        if (b.chain && b.resno) {
          sels.add(`:${b.chain} and resi ${b.resno}`);
          added++;
          perTypeAdded++;
        } else {
          missing++;
          perTypeMissing++;
        }
      }
      const perChainAdded = added - perChainAddedBefore;
      console.log(`[NGL json][residue] type=${typ} chainGroup=${cg} added=${perChainAdded}`);
    }

    console.log(`[NGL json][residue] type=${typ} summary added=${perTypeAdded} missing=${perTypeMissing}`);
  }

  if (sels.size === 0) return null;
  const sele = Array.from(sels).join(" or ");
  console.log("[NGL json] residue sele built; uniqueResidues =", sels.size, "addedOps =", added, "missingOps =", missing, { preview: (Array.from(sels).join(" or ").slice(0, 180) + (sels.size > 5 ? '...' : '')) });
  return sele;
}

/** JSON → atom sele (활성 타입만, @serial 기반) */
function buildAtomSeleFromJson(
  data: NglInteractionJson | null,
  active: Set<string>
): string | null {
  if (!data) return null;
  if (active.size === 0) {
    console.log("[NGL json] atom sele skipped (no active types)");
    return null;
  }
  const sels = new Set<string>();
  let added = 0;
  let missing = 0;

  for (const [typ, byChain] of Object.entries(data)) {
    if (!active.has(typ)) continue;
    if (!byChain) continue;

    for (const [cg, pairs] of Object.entries(byChain)) {
      let perChainAdded = 0;
      for (const [la, lb] of pairs) {
        const a = parseJsonLabel(la);
        const b = parseJsonLabel(lb);
        if (a.serial) {
          sels.add(`@${a.serial}`);
          added++;
          perChainAdded++;
        } else missing++;
        if (b.serial) {
          sels.add(`@${b.serial}`);
          added++;
          perChainAdded++;
        } else missing++;
      }
      console.log(`[NGL json][atom] type=${typ} chainGroup=${cg} added=${perChainAdded}`);
    }
  }

  if (sels.size === 0) return null;
  const sele = Array.from(sels).join(" or ");
  console.log("[NGL json] atom sele built; uniqueAtoms =", sels.size, "addedOps =", added, "missingOps =", missing);
  return sele;
}

/** JSON → 타입별 distance atomPair (활성 타입만, @serial 기반) */
function computeAtomPairsByTypeFromJson(
  data: NglInteractionJson | null,
  active: Set<string>
): Record<string, [string, string][]> {
  const out: Record<string, [string, string][]> = {};
  if (!data || active.size === 0) {
    console.log("[NGL json] distance pairs skipped (no active types or no data)");
    return out;
  }

  for (const [typ, byChain] of Object.entries(data)) {
    if (!active.has(typ)) continue;
    if (!byChain) continue;

    let totalAdded = 0;
    let totalMissing = 0;
    for (const [cg, pairs] of Object.entries(byChain)) {
      let perChainAdded = 0;
      for (const [la, lb] of pairs) {
        const a = parseJsonLabel(la);
        const b = parseJsonLabel(lb);
        if (a.serial && b.serial) {
          (out[typ] ??= []).push([`@${a.serial}`, `@${b.serial}`]);
          totalAdded++;
          perChainAdded++;
        } else {
          totalMissing++;
        }
      }
      console.log(`[NGL json][distance] type=${typ} chainGroup=${cg} added=${perChainAdded}`);
    }

    const arr = out[typ] ?? [];
    console.log(`[NGL json][distance] type=${typ} summary totalPairs=${arr.length} added=${totalAdded} missing=${totalMissing} sample=${JSON.stringify(sample(arr, DEBUG_SAMPLE))}`);
  }
  return out;
}

/* ============ Main ============ */
export default function Interaction(): React.JSX.Element {
  const [mode, setMode] = React.useState<Mode>("atom");

  const [atomPayload, setAtomPayload] = React.useState<GraphPayload | null>(
    null
  );
  const [resPayload, setResPayload] = React.useState<GraphPayload | null>(null);

  const [atomRowsRaw, setAtomRowsRaw] = React.useState<AtomRow[]>([]);
  const [resRowsRaw, setResRowsRaw] = React.useState<ResidueRow[]>([]);

  const [atomSummary, setAtomSummary] = React.useState<FetchSummary | null>(
    null
  );
  const [resSummary, setResSummary] = React.useState<FetchSummary | null>(null);

  const [selectedTypes, setSelectedTypes] = React.useState<
    Record<string, boolean>
  >(() => Object.fromEntries(INTERACTION_TYPES.map((t) => [t, false])));

  // ✅ NEW: NGL 전용 JSON 상태
  const [nglJson, setNglJson] = React.useState<NglInteractionJson | null>(null);

  const onToggleType = (typ: string) => {
    setSelectedTypes((prev) => ({ ...prev, [typ]: !prev[typ] }));
  };
  const onSetAll = (checked: boolean) => {
    setSelectedTypes(
      Object.fromEntries(
        INTERACTION_TYPES.map((t) => [
          t,
          checked ? (countsByType[t] ?? 0) > 0 : false, // ← 0개 타입은 항상 false
        ])
      )
    );
  };

  React.useEffect(() => {
    console.log("[FETCH] start: atom-graph, res-graph, json", { PDB_ID });
    Promise.all([
      fetch(`/api/atom-graph/${encodeURIComponent(PDB_ID)}`, {
        headers: { "cache-control": "no-cache" },
      }).then((r) => r.json()),
      fetch(`/api/res-graph/${encodeURIComponent(PDB_ID)}`, {
        headers: { "cache-control": "no-cache" },
      }).then((r) => r.json()),
      // ✅ NGL 전용 JSON
      fetch(`/api/json/${encodeURIComponent(PDB_ID)}`, {
        headers: { "cache-control": "no-cache" },
      }).then((r) => r.json()),
    ])
      .then(([atomRaw, resRaw, jsonRaw]) => {
        console.log("[FETCH] done. Shapes:", {
          atom: {
            hasNodes: !!atomRaw?.nodes,
            hasLinks: !!atomRaw?.links,
          },
          res: {
            hasNodes: !!resRaw?.nodes,
            hasLinks: !!resRaw?.links,
          },
          jsonTypes: Object.keys(jsonRaw ?? {}).length,
        });

        // Strongly type the JSON for counting
        const jsonTyped = (jsonRaw ?? {}) as NglInteractionJson;
        const tcounts: Record<string, { chainGroups: number; pairs: number }> = {};
        for (const [typ, byChain] of Object.entries(jsonTyped)) {
          if (!byChain) continue;
          const groups = Object.keys(byChain).length;
          const totalPairs = Object.values(byChain).reduce<number>((acc, arr) => {
            const len = Array.isArray(arr) ? arr.length : 0;
            return acc + len;
          }, 0);
          tcounts[typ] = { chainGroups: groups, pairs: totalPairs };
        }
        console.log("[FETCH json] per-type counts:", tcounts);

        // Added debug: show one example tuple per available type including distance/angle if present
        const jsonFirstSamples: Record<string, unknown> = {};
        for (const [typ, byChain] of Object.entries(jsonTyped)) {
          if (!byChain) continue;
          for (const [cg, arr] of Object.entries(byChain)) {
            const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
            if (first) { jsonFirstSamples[`${typ}:${cg}`] = first; break; }
          }
        }
        console.log('[FETCH json] first-samples (label1,label2,dist,angle?)', jsonFirstSamples);

        const atomNorm = normalizeGraph(atomRaw);
        const resNorm = normalizeGraph(resRaw);

        setAtomPayload(atomNorm);
        setResPayload(resNorm);

        setAtomSummary({
          nodes: atomNorm.nodes.length,
          links: atomNorm.links.length,
        });
        setResSummary({
          nodes: resNorm.nodes.length,
          links: resNorm.links.length,
        });

        setAtomRowsRaw(buildAtomRows(atomNorm));
        setResRowsRaw(buildResidueRowsFromPayload(resNorm));

        setNglJson(jsonTyped);
      })
      .catch((e) => {
        console.log("[FETCH] error:", e);
        setAtomPayload({ nodes: [], links: [] });
        setResPayload({ nodes: [], links: [] });
        setAtomSummary({ nodes: 0, links: 0 });
        setResSummary({ nodes: 0, links: 0 });
        setAtomRowsRaw([]);
        setResRowsRaw([]);
        setNglJson(null);
      });
  }, []);

  const countsByType = React.useMemo(() => {
    const map: Record<string, number> = Object.fromEntries(
      INTERACTION_TYPES.map((t) => [t, 0])
    );
    const list = mode === "atom" ? atomRowsRaw : resRowsRaw;
    for (const r of list)
      map[r["Interaction Type"]] = (map[r["Interaction Type"]] ?? 0) + 1;
    return map;
  }, [mode, atomRowsRaw, resRowsRaw]);

  const activeTypes = React.useMemo(
    () =>
      new Set(
        Object.entries(selectedTypes)
          .filter(([, v]) => v)
          .map(([k]) => k)
      ),
    [selectedTypes]
  );

  const basePayload =
    mode === "atom"
      ? atomPayload ?? { nodes: [], links: [] }
      : resPayload ?? { nodes: [], links: [] };

  const filteredPayload = React.useMemo(() => {
    if (activeTypes.size === 0) return { nodes: [], links: [] };
    if (activeTypes.size === INTERACTION_TYPES.length) return basePayload;
    return filterPayloadByTypes(basePayload, activeTypes);
  }, [basePayload, activeTypes]);

  const atomRows = React.useMemo(() => {
    if (activeTypes.size === INTERACTION_TYPES.length) return atomRowsRaw;
    return atomRowsRaw.filter((r) => activeTypes.has(r["Interaction Type"]));
  }, [atomRowsRaw, activeTypes]);

  const resRows = React.useMemo(() => {
    if (activeTypes.size === INTERACTION_TYPES.length) return resRowsRaw;
    return resRowsRaw.filter((r) => activeTypes.has(r["Interaction Type"]));
  }, [resRowsRaw, activeTypes]);

  /* ============ NGL 연동 ============ */
  const { component, highlightRep, setHighlightRep } = useNgl();

  /** residue 라벨 파서 ("R/153/…", "A/503/…", "R/153/SER") → :Chain and resi N */
  function parseResidue(label: string): { chain?: string; resno?: string } {
    const m1 = label.match(/([A-Za-z0-9])\s*\/\s*(\d{1,5})/); // "A/503"
    if (m1) return { chain: m1[1], resno: m1[2] };
    const m2 = label.match(/(\d{1,5})\s*[:]\s*([A-Za-z0-9])/); // "503:A"
    if (m2) return { chain: m2[2], resno: m2[1] };
    const m3 = label.match(/([A-Za-z0-9])\s*[, ]?\s*(\d{1,5})/); // "A 503"
    if (m3) return { chain: m3[1], resno: m3[2] };
    return {};
  }

  /** atom 라벨 파서 ("R/153/SER/OG/76") → serial 우선 (distance용) */
  function parseAtomLabel(label: string): {
    chain?: string;
    resno?: string;
    atom?: string;
    serial?: string;
  } {
    const parts = label
      .trim()
      .split("/")
      .map((s) => s.trim());
    const [chain, resno, _resName, atom, serial] = parts;
    return {
      chain: chain && /^[A-Za-z0-9]$/.test(chain) ? chain : undefined,
      resno: resno && /^\d{1,5}$/.test(resno) ? resno : undefined,
      atom: atom && atom.length > 0 ? atom : undefined,
      serial: serial && /^\d+$/.test(serial) ? serial : undefined,
    };
  }

  /** rows → residue OR sele (항상 residue 기반; Table/Graph 유지용) */
  function buildResidueSele(
    rows: Array<{ Atom1: string; Atom2: string }>
  ): string | null {
    const sels = new Set<string>();
    for (const r of rows) {
      const a = parseResidue(r.Atom1);
      const b = parseResidue(r.Atom2);
      if (a.chain && a.resno) sels.add(`:${a.chain} and resi ${a.resno}`);
      if (b.chain && b.resno) sels.add(`:${b.chain} and resi ${b.resno}`);
    }
    if (sels.size === 0) return null;
    const sele = Array.from(sels).join(" or ");
    console.log("[NGL rows->residue sele] uniqueResidues =", sels.size);
    return sele;
  }

  // (A) 베이스 cartoon 보장: 한 번만
  const [baseRepAdded, setBaseRepAdded] = React.useState(false);
  React.useEffect(() => {
    if (!component || baseRepAdded) return;
    const rep = addRepSafe(component, "cartoon", {
      colorScheme: "sstruc",
      quality: "high",
      visible: true,
    });
    if (rep) {
      setBaseRepAdded(true);
      console.log("[NGL base] cartoon(sstruc, high) added once");
    } else {
      console.log("[NGL base] cartoon add failed");
    }
  }, [component, baseRepAdded]);

  // (B) residue/atom 하이라이트 — ✅ JSON 기반 (활성 타입만)
  React.useEffect(() => {
    if (!component) return;

    // 활성 타입 정보 로그
    const act = Array.from(activeTypes);
    console.log("[NGL highlight] mode=", mode, "activeTypes=", act);

    const sele =
      mode === "residue"
        ? buildResidueSeleFromJson(nglJson, activeTypes)
        : buildAtomSeleFromJson(nglJson, activeTypes);

    if (!sele) {
      disposeSafe(highlightRep);
      setHighlightRep(null);
      console.log("[NGL] highlight cleared (no sele or no active types)");
      return;
    }

    // 기존 하이라이트 제거 후 교체
    disposeSafe(highlightRep);
    setHighlightRep(null);

    const orCount = sele.split(" or ").length;
    const rep = addRepSafe(component, "ball+stick", {
      sele,
      colorScheme: "element",
      quality: "high",
      radiusScale: 1.0,
      scale: 1.2,
      visible: true,
    });
    if (rep) {
      setHighlightRep(rep);
      console.log("[NGL] highlight added", { mode, orCount, selePreview: sele.slice(0, 120) + (sele.length > 120 ? "..." : "") });
    } else {
      console.log("[NGL] highlight add failed", { mode, orCount });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component, mode, nglJson, activeTypes, setHighlightRep]);

  /* ---------- distance 라인 (타입별) ---------- */
  const [distanceReps, setDistanceReps] = React.useState<
    Record<string, NGL.Representation>
  >({});

  React.useEffect(() => {
    if (!component) return;

    // 이전 distance 제거
    Object.values(distanceReps).forEach(disposeSafe);
    setDistanceReps({});

    if (activeTypes.size === 0) {
      console.log("[NGL distance] no active types, cleared");
      return;
    }

    // ✅ JSON 기반으로 distance 쌍 계산 (활성 타입만)
    const byType = computeAtomPairsByTypeFromJson(nglJson, activeTypes);
    const counts = Object.fromEntries(
      Object.entries(byType).map(([t, arr]) => [t, arr.length])
    );
    console.log("[NGL distance] pairs by type (active only) =", counts);

    const next: Record<string, NGL.Representation> = {};
    for (const [typ, pairs] of Object.entries(byType)) {
      if (!pairs.length) continue;
      const hex = (TYPE_HEX as Record<string, string>)[typ as InteractionType] ?? "#6b7280";
      const rep = addRepSafe(component, "distance", {
        name: `dist-${typ}`,
        atomPair: pairs,
        labelVisible: false,
        color: hex,
      });
      if (rep) {
        next[typ] = rep;
        console.log(`[NGL distance] add '${typ}'`, { labelVisible: false, color: hex, pairs: pairs.length, sample: sample(pairs, DEBUG_SAMPLE) });
      } else {
        console.log(`[NGL distance] failed to add '${typ}' (${pairs.length} pairs)`);
      }
    }
    setDistanceReps(next);
  }, [component, nglJson, activeTypes]);

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Filter */}
      <div className="rounded-2xl border border-zinc-200 p-4">
        <FilterPane
          mode={mode}
          setMode={setMode}
          selectedTypes={selectedTypes}
          onToggleType={onToggleType}
          onSetAll={onSetAll}
          countsByType={countsByType}
        />
      </div>

      {/* Graph */}
      <div className="rounded-2xl border border-zinc-200 p-4">
        <GraphPane
          filteredPayload={filteredPayload}
          atomSummary={atomSummary}
          residueSummary={resSummary}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200 p-4">
        <TablePane
          mode={mode}
          atomRows={atomRows}
          residueRows={resRows}
          pdbId={PDB_ID}
          resolveTypeColor={getTypeColor}
        />
      </div>
    </div>
  );
}
