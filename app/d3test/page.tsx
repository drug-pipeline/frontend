"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import NglWebapp from "../components/NglWebapp";
import { NglProvider, useNgl } from "../components/NglContext";

/* =============================
 * tiny logger
 * ===========================*/
function clog(scope: string, msg: string, ...more: unknown[]) {
  const ts = new Date().toISOString();
  console.log(`[${scope}] ${ts} ${msg}`, ...more);
}

/* =============================
 * Types
 * ===========================*/
type Id = string | number;

type AtomGraph = {
  nodes?: Array<Record<string, unknown>>;
  links?: unknown[] | Record<string, unknown[]>;
};

type ResNode = {
  id?: Id;
  label?: string;
  role?: "A" | "R" | string;
} & Record<string, unknown>;

type ResLink = {
  source: unknown;
  target: unknown;
  type?: string;
  distance?: number;
  colour?: string;
} & Record<string, unknown>;

type ResGraph = {
  nodes?: ResNode[];
  links?: ResLink[] | Record<string, ResLink[]>;
};

type Pair = "AA" | "AR" | "RR";
type RoleAR = "A" | "R";
type NgAtomPair = [string, string];

interface FGNode extends d3.SimulationNodeDatum {
  id: Id;
  label?: string;
  role?: "A" | "R" | string;
}
interface FGLink extends d3.SimulationLinkDatum<FGNode> {
  source: Id | FGNode;
  target: Id | FGNode;
  type?: string;
  distance?: number;
  pair?: Pair;
  _pidx?: number;
  _pcount?: number;
}

const toId = (v: Id | FGNode): Id =>
  typeof v === "object" ? (v as FGNode).id : v;

/* =============================
 * Constants
 * ===========================*/
type TileKey =
  | "clash" | "covalent" | "vdw_clash" | "vdw" | "proximal" | "hbond"
  | "weak_hbond" | "halogen_bond" | "ionic" | "metal_complex" | "aromatic"
  | "hydrophobic" | "carbonyl" | "polar" | "weak_polar";

const TILE_ORDER: TileKey[] = [
  "clash","covalent","vdw_clash","vdw","proximal","hbond",
  "weak_hbond","halogen_bond","ionic","metal_complex","aromatic","hydrophobic",
  "carbonyl","polar","weak_polar",
];

const TILE_COLORS: Record<TileKey, string> = {
  clash:"#ff6b5b", covalent:"#2dd34f", vdw_clash:"#7b00ff", vdw:"#1E90FF",
  proximal:"#FFD700", hbond:"#00FA9A", weak_hbond:"#7FFFD4", halogen_bond:"#ff0f89",
  ionic:"#ffa300", metal_complex:"#7b3f00", aromatic:"#5b18f0", hydrophobic:"#228B22",
  carbonyl:"#DC143C", polar:"#00CED1", weak_polar:"#20B2AA",
};

const ROLE_COLORS: Record<RoleAR, string> = { A: "#3b82f6", R: "#ef4444" };

/* =============================
 * Utilities
 * ===========================*/
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

function pairKeyToPair(k: string): Pair | null {
  if (k === "A-A") return "AA";
  if (k === "R-R") return "RR";
  if (k === "A-R" || k === "R-A") return "AR";
  return null;
}

function countLinksUnknown(
  links: unknown[] | Record<string, unknown[]> | undefined | null
): number {
  if (!links) return 0;
  if (Array.isArray(links)) return links.length;
  return Object.values(links as Record<string, unknown[]>).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
  );
}

function prettyNodeLabel(raw: unknown, fallback: string): string {
  if (!isObj(raw)) return fallback;
  if (typeof raw["label"] === "string" && raw["label"].trim() !== "") {
    return raw["label"] as string;
  }
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if ((typeof v === "string" && v.trim() !== "") || (typeof v === "number" && Number.isFinite(v))) {
        return String(v);
      }
    }
    return undefined;
  };
  const role = pick("role", "group");
  const resno = pick("resno", "resi", "resSeq", "resid");
  const resname = pick("resname", "resn", "resName");
  const atom = pick("atom", "atomName", "name");
  let serial = pick("serial","atomSerial","serialNumber","atomId","index","atom_index","atomIndex");
  if (serial && !/^\d+$/.test(serial)) serial = undefined;
  const parts = [role, resno, resname, atom, serial].filter(Boolean) as string[];
  return parts.length ? parts.join("/") : fallback;
}

function buildAtomLabelLookup(
  rawLinks: unknown[] | Record<string, unknown[]> | undefined
): Map<Id, string> {
  const m = new Map<Id, string>();
  const pushIf = (key: unknown, obj: unknown) => {
    const id = typeof key === "string" || typeof key === "number" ? (key as Id) : undefined;
    if (!id || !isObj(obj)) return;
    const label = prettyNodeLabel(obj, "");
    if (label) m.set(id, label);
  };
  const scan = (lnk: unknown) => {
    if (!isObj(lnk)) return;
    const link = lnk as Record<string, unknown>;
    const cand: Array<[string, string]> = [
      ["A","sourceId"],["B","targetId"],["a","sourceId"],["b","targetId"],
      ["src","source"],["dst","target"],["left","source"],["right","target"],
      ["atomA","source"],["atomB","target"],
    ];
    const idFrom = (obj: unknown, fallback: unknown): Id | undefined => {
      if (!isObj(obj)) {
        return typeof fallback === "string" || typeof fallback === "number" ? (fallback as Id) : undefined;
      }
      const o = obj as Record<string, unknown>;
      const cand = o["atomId"] ?? o["index"] ?? o["serial"] ?? o["atom_index"];
      return (typeof cand === "string" || typeof cand === "number") ? (cand as Id) : undefined;
    };
    for (const [metaK, idK] of cand) {
      const meta = link[metaK];
      const idv = link[idK];
      if (meta && isObj(meta)) {
        const id = idFrom(meta, idv);
        if (id != null) pushIf(id, meta);
      }
    }
    const direct: Array<[string,string]> = [["sourceMeta","source"],["targetMeta","target"]];
    for (const [metaK, idK] of direct) {
      const meta = link[idK+"Meta"];
      const idv = link[idK];
      if (isObj(meta) && (typeof idv === "string" || typeof idv === "number")) pushIf(idv, meta);
    }
  };
  if (!rawLinks) return m;
  if (Array.isArray(rawLinks)) { rawLinks.forEach(scan); return m; }
  for (const v of Object.values(rawLinks as Record<string, unknown>)) {
    if (Array.isArray(v)) v.forEach(scan);
    else if (isObj(v)) for (const arr of Object.values(v)) if (Array.isArray(arr)) arr.forEach(scan);
  }
  return m;
}

function roleFromLabel(n: { label?: unknown }): RoleAR | null {
  const raw = n?.label;
  if (typeof raw !== "string") return null;
  const first = raw.split("/")[0]?.trim().toUpperCase();
  return first === "A" || first === "R" ? (first as RoleAR) : null;
}

function computeDegreeMap(links: Array<FGLink>): Map<Id, number> {
  const deg = new Map<Id, number>();
  const norm = (v: Id | { id: Id }): Id =>
    (typeof v === "object" && v !== null ? (v as { id: Id }).id : v) as Id;
  for (const l of links) {
    const s = norm(l.source); const t = norm(l.target);
    if (s != null) deg.set(s, (deg.get(s) ?? 0) + 1);
    if (t != null) deg.set(t, (deg.get(t) ?? 0) + 1);
  }
  return deg;
}

function makeRadiusScaler(deg: Map<Id, number>, rMin = 4, rMax = 18) {
  const maxDeg = Math.max(1, ...deg.values());
  const scale = d3.scaleSqrt<number, number>().domain([0, maxDeg]).range([rMin, rMax]);
  return (id: Id) => scale(deg.get(id) ?? 0);
}

function buildAtomPairsByTile(
  links: ResLink[], roleLookup?: Map<Id, RoleAR>, allowedPairs?: Set<"AA"|"AR"|"RR">
): Map<TileKey, NgAtomPair[]> {
  const byTile = new Map<TileKey, NgAtomPair[]>();
  const toAtomId = (v: unknown): Id | null => {
    if (typeof v === "string" || typeof v === "number") return v;
    if (isObj(v)) {
      const maybe = v["id"];
      if (typeof maybe === "string" || typeof maybe === "number") return maybe as Id;
    }
    return null;
  };
  const toPair = (ra?: RoleAR, rb?: RoleAR): "AA" | "AR" | "RR" | null => {
    if (!ra || !rb) return null;
    if (ra === "A" && rb === "A") return "AA";
    if (ra === "R" && rb === "R") return "RR";
    return "AR";
  };
  for (const l of links) {
    const t = (l.type ?? "") as TileKey | string;
    if (!TILE_ORDER.includes(t as TileKey)) continue;
    const sId = toAtomId(l.source);
    const tId = toAtomId(l.target);
    if (sId == null || tId == null) continue;
    if (roleLookup && roleLookup.size) {
      const ra = roleLookup.get(sId);
      const rb = roleLookup.get(tId);
      const p = toPair(ra, rb);
      if (allowedPairs && (!p || !allowedPairs.has(p))) continue;
    }
    const a = `@${sId}`; const b = `@${tId}`;
    const arr = byTile.get(t as TileKey) ?? [];
    arr.push([a, b]);
    byTile.set(t as TileKey, arr);
  }
  return byTile;
}

/* =============================
 * Filter state + bar
 * ===========================*/
type TileState = { pairs: Record<Pair, boolean> };

function useFilterState() {
  const [tiles, setTiles] = useState<Record<TileKey, TileState>>(() => {
    const base: TileState = { pairs: { AA: false, AR: false, RR: false } };
    return Object.fromEntries(TILE_ORDER.map((k) => [k, { ...base }])) as Record<TileKey, TileState>;
  });
  const [proxChecked, setProxChecked] = useState(false);
  const [proxAng, setProxAng] = useState<3 | 4 | 5>(5);
  const togglePair = (k: TileKey, p: Pair) =>
    setTiles((prev) => ({ ...prev, [k]: { pairs: { ...prev[k].pairs, [p]: !prev[k].pairs[p] } } }));
  return { tiles, togglePair, proxChecked, setProxChecked, proxAng, setProxAng };
}

function FilterBar({
  tiles, togglePair, presentPairsByTile, proxAvailable,
  proxChecked, setProxChecked, proxAng, setProxAng,
}: {
  tiles: Record<TileKey, TileState>;
  togglePair: (k: TileKey, p: Pair) => void;
  presentPairsByTile: Map<TileKey, Set<Pair>>;
  proxAvailable: boolean;
  proxChecked: boolean;
  setProxChecked: (b: boolean) => void;
  proxAng: 3 | 4 | 5;
  setProxAng: (v: 3 | 4 | 5) => void;
}) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {TILE_ORDER.map((k) => {
          const presentPairs = presentPairsByTile.get(k) ?? new Set<Pair>();
          const showPairs = [...presentPairs];
          const isProx = k === "proximal";
          return (
            <div key={k} className="rounded-2xl px-4 py-3 shadow-sm border text-white" style={{ backgroundColor: TILE_COLORS[k] }}>
              <div className="font-semibold tracking-wide">{k}</div>
              {isProx ? (
                proxAvailable ? (
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={proxChecked} onChange={(e) => setProxChecked(e.target.checked)} />
                      <span>proximal</span>
                    </label>
                    <div className="space-x-3">
                      {[3,4,5].map((n) => (
                        <label key={n} className={`inline-flex items-center gap-1 ${proxChecked ? "" : "opacity-60"}`}>
                          <input type="radio" name="proxAng" checked={proxAng === n} onChange={() => setProxAng(n as 3|4|5)} disabled={!proxChecked} />
                          <span>{n}Å</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null
              ) : showPairs.length > 0 ? (
                <div className="mt-2 grid gap-1 text-sm">
                  {showPairs.map((p) => (
                    <label key={p} className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={tiles[k].pairs[p]} onChange={() => togglePair(k, p)} />
                      <span>{p[0]}-{p[1]}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================
 * Mini Force Graph
 * ===========================*/
function MiniForceGraph({
  title, nodes, links, nodeColors, onNodeClick,
}: {
  title: string;
  nodes: Array<FGNode>;
  links: Array<FGLink>;
  nodeColors?: Map<Id, string>;
  onNodeClick?: (n: FGNode) => void;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    clog("Graph", `build start: nodes=${nodes.length}, links=${links.length}`);
    const nodesCast: FGNode[] = nodes.map((n) => ({ ...n }));
    const linksCast: FGLink[] = links.map((l) => ({ ...l }));
    const pairKey = (s: Id | FGNode, t: Id | FGNode) => {
      const a = toId(s); const b = toId(t);
      return a <= b ? `${a}--${b}` : `${b}--${a}`;
    };
    const groups = new Map<string, FGLink[]>();
    for (const l of linksCast) {
      const key = pairKey(l.source, l.target);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(l);
    }
    for (const arr of groups.values()) arr.forEach((l, i) => { l._pidx = i; l._pcount = arr.length; });
    const deg = computeDegreeMap(linksCast);
    const rScale = makeRadiusScaler(deg, 4, 18);
    const svg = d3.select<SVGSVGElement, unknown>(ref.current);
    const width = parseInt(svg.style("width")) || 600;
    const height = parseInt(svg.style("height")) || 360;
    svg.selectAll("*").remove();
    const link = svg.append("g").attr("fill", "none").attr("stroke-opacity", 0.85)
      .selectAll<SVGPathElement, FGLink>("path")
      .data(linksCast).enter().append("path")
      .attr("stroke-width", 1.5)
      .attr("stroke", (d) => d.type && (TILE_COLORS as Record<string,string>)[d.type] ? (TILE_COLORS as Record<string,string>)[d.type] : "#bbb");
    const nodeSel = svg.append("g").attr("stroke", "#fff").attr("stroke-width", 1.0)
      .selectAll<SVGCircleElement, FGNode>("circle")
      .data(nodesCast).enter().append<SVGCircleElement>("circle")
      .attr("r", (d) => rScale(d.id))
      .attr("fill", (d) => nodeColors?.get(d.id) ?? "#bdbdbd")
      .style("cursor", "pointer").on("click", (_evt, d) => onNodeClick?.(d));
    const LABEL_LIMIT = 400;
    const shouldShowLabels = nodesCast.length <= LABEL_LIMIT;
    const label = svg.append("g").selectAll<SVGTextElement, FGNode>("text")
      .data(shouldShowLabels ? nodesCast : []).enter().append("text")
      .attr("font-size", 10).attr("dx", 6).attr("dy", 3).text((d) => d.label ?? String(d.id));
    const sim = d3.forceSimulation<FGNode>(nodesCast)
      .force("link", d3.forceLink<FGNode, FGLink>(linksCast).id((d) => d.id).distance(45).strength(0.6))
      .force("charge", d3.forceManyBody<FGNode>().strength(-80))
      .force("center", d3.forceCenter(width/2, height/2))
      .alpha(0.9).alphaDecay(0.12).velocityDecay(0.5);
    const asNode = (v: Id | FGNode): FGNode => v as FGNode;
    const quadPath = (d: FGLink) => {
      const s = asNode(d.source); const t = asNode(d.target);
      const x1 = s.x ?? 0, y1 = s.y ?? 0, x2 = t.x ?? 0, y2 = t.y ?? 0;
      const count = d._pcount ?? 1, idx = d._pidx ?? 0;
      if (count === 1) { const mx = (x1+x2)/2, my = (y1+y2)/2; return `M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`; }
      const midx = (x1+x2)/2, midy = (y1+y2)/2;
      const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy) || 1;
      const ux = -dy/len, uy = dx/len, spread = 14, offset = (idx - (count-1)/2)*spread;
      const cx = midx + ux*offset, cy = midy + uy*offset;
      return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
    };
    const updateDom = () => {
      link.attr("d", quadPath);
      nodeSel.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    };
    const MAX_TICKS = 160, UPDATE_EVERY = 2;
    for (let i=0;i<MAX_TICKS;i++){ sim.tick(); if (i % UPDATE_EVERY === 0) updateDom(); }
    updateDom(); sim.stop();
    clog("Graph", "build done");
    return () => { sim.stop(); };
  }, [nodes, links, onNodeClick, nodeColors]);
  return (
    <div className="rounded-2xl border p-3 flex flex-col gap-2 min-h-0 bg-white">
      <div className="font-semibold">{title}</div>
      <svg ref={ref} className="w-full" style={{ height: 360 }} />
    </div>
  );
}

/* =============================
 * Main Panel
 * ===========================*/
function Panel({ atomGraph, resGraph }: { atomGraph: AtomGraph | null; resGraph: ResGraph | null; }) {
  const { component, highlightRep, setHighlightRep } = useNgl();
  const [tab, setTab] = useState<"atom" | "res">("res");
  const [showIsolated, setShowIsolated] = useState(false);
  const [linkReps, setLinkReps] = useState<unknown[] | null>(null);
  const { tiles, togglePair, proxChecked, setProxChecked, proxAng, setProxAng } = useFilterState();

  type RawLinkLike = { source: unknown; target: unknown; type?: unknown; distance?: unknown; pair?: unknown };
  const isRawLinkLike = (v: unknown): v is RawLinkLike => isObj(v) && "source" in v && "target" in v;

  const extractLinksWithPair = (rawLinks: ResGraph["links"] | AtomGraph["links"]): Array<FGLink> => {
    const out: FGLink[] = [];
    const push = (link: RawLinkLike, hintType?: TileKey, hintPair?: Pair) => {
      const innerType = typeof link.type === "string" && (TILE_ORDER as string[]).includes(link.type) ? (link.type as TileKey) : undefined;
      const innerPair = typeof link.pair === "string" ? pairKeyToPair(link.pair as string) : null;
      out.push({
        source: link.source as Id,
        target: link.target as Id,
        distance: typeof link.distance === "number" ? link.distance : undefined,
        type: innerType ?? hintType ?? undefined,
        pair: innerPair ?? hintPair ?? undefined,
      });
    };
    if (!rawLinks) return out;
    if (Array.isArray(rawLinks)) { for (const v of rawLinks) if (isRawLinkLike(v)) push(v); return out; }
    for (const [k, val] of Object.entries(rawLinks as Record<string, unknown>)) {
      const kAsType = (TILE_ORDER as string[]).includes(k) ? (k as TileKey) : undefined;
      const kAsPair = pairKeyToPair(k);
      if (Array.isArray(val)) { for (const v of val) if (isRawLinkLike(v)) push(v, kAsType, kAsPair ?? undefined); continue; }
      if (isObj(val)) {
        for (const [k2, arr] of Object.entries(val)) {
          if (!Array.isArray(arr)) continue;
          const k2AsType = (TILE_ORDER as string[]).includes(k2) ? (k2 as TileKey) : undefined;
          const k2AsPair = pairKeyToPair(k2);
          const hintType = k2AsType ?? kAsType;
          const hintPair = k2AsPair ?? kAsPair ?? undefined;
          for (const v of arr) if (isRawLinkLike(v)) push(v, hintType, hintPair);
        }
      }
    }
    return out;
  };

  const normalizeLinksWithPair = (raw: Array<FGLink>) =>
    raw.map((l) => {
      const s = toId(l.source as Id | FGNode);
      const t = toId(l.target as Id | FGNode);
      if (s == null || t == null) return null;
      return { ...l, source: s, target: t };
    }).filter((x): x is FGLink & { source: Id; target: Id } => x !== null);

  const computePresentPairsByTile = (links: Array<FGLink>) => {
    const m = new Map<TileKey, Set<Pair>>();
    for (const l of links) {
      if (!l.type || !l.pair) continue;
      if (!m.has(l.type as TileKey)) m.set(l.type as TileKey, new Set<Pair>());
      m.get(l.type as TileKey)!.add(l.pair);
    }
    return m;
  };
  const computeProxAvailable = (links: Array<FGLink>) => links.some((l) => typeof l.distance === "number");

  function computeNodeColors(nodes: Array<FGNode>): Map<Id, string> {
    const m = new Map<Id, string>();
    for (const n of nodes) {
      const role = roleFromLabel({ label: n.label });
      m.set(n.id, role ? ROLE_COLORS[role] : "#bdbdbd");
    }
    return m;
  }

  function hasAnySelection(presentPairsByTile: Map<TileKey, Set<Pair>>, proxAvailable: boolean): boolean {
    const pairOn = TILE_ORDER.some((k) => {
      if (k === "proximal") return false;
      const present = presentPairsByTile.get(k);
      if (!present || present.size === 0) return false;
      const state = tiles[k].pairs;
      return ((state.AA && present.has("AA")) || (state.AR && present.has("AR")) || (state.RR && present.has("RR")));
    });
    return pairOn || (proxAvailable && proxChecked);
  }

  const atomLabelLookup = useMemo(() => buildAtomLabelLookup(atomGraph?.links), [atomGraph?.links]);

  const roleLookup = useMemo(() => {
    const m = new Map<Id, RoleAR>();
    if (tab === "res") {
      if (Array.isArray(resGraph?.nodes)) {
        for (const n of resGraph!.nodes!) {
          const id = typeof n.id === "string" || typeof n.id === "number" ? (n.id as Id) : undefined;
          if (id == null) continue;
          const role = roleFromLabel({ label: n.label });
          if (role) m.set(id, role);
        }
      }
    } else {
      if (Array.isArray(atomGraph?.nodes)) {
        (atomGraph!.nodes as unknown[]).forEach((n, i) => {
          const o = n as Record<string, unknown>;
          const id = typeof o.id === "string" || typeof o.id === "number" ? (o.id as Id) : (i as Id);
          const fallback = String(id);
          const label = typeof o.label === "string" ? (o.label as string) : prettyNodeLabel(o, atomLabelLookup.get(id) ?? fallback);
          const role = roleFromLabel({ label });
          if (role) m.set(id, role);
        });
      }
    }
    return m;
  }, [tab, resGraph?.nodes, atomGraph?.nodes, atomLabelLookup]);

  const cur = useMemo(() => {
    const g = tab === "res" ? resGraph : atomGraph;
    const raw = extractLinksWithPair(g?.links);
    const norm0 = normalizeLinksWithPair(raw);
    const norm = norm0.map((l) => {
      if (l.pair) return l;
      const sRole = roleLookup.get(l.source as Id);
      const tRole = roleLookup.get(l.target as Id);
      if (sRole && tRole) {
        const p: Pair = sRole === "A" && tRole === "A" ? "AA" : sRole === "R" && tRole === "R" ? "RR" : "AR";
        return { ...l, pair: p };
      }
      return l;
    });
    const presentPairsByTile = computePresentPairsByTile(norm);
    const proxAvailable = computeProxAvailable(norm);
    const anySel = hasAnySelection(presentPairsByTile, proxAvailable);
    const filtered = norm.filter((l) => {
      if (!anySel) return false;
      let pass = false;
      if (l.type && l.pair) {
        if ((tiles[l.type as TileKey]?.pairs ?? {})[l.pair]) pass = true;
      }
      if (!pass && proxChecked && typeof l.distance === "number") pass = l.distance <= proxAng;
      return pass;
    });

    let nodesAll: FGNode[] = [];
    if (tab === "res") {
      nodesAll = Array.isArray(resGraph?.nodes)
        ? resGraph!.nodes!.map((n, i) => ({
            id: typeof n.id === "string" || typeof n.id === "number" ? n.id : i,
            label: typeof n.label === "string" ? n.label : undefined,
            role: typeof n.role === "string" ? n.role : undefined,
          }))
        : [];
    } else {
      type AtomNodeLike = { id?: unknown; label?: unknown; role?: unknown } & Record<string, unknown>;
      nodesAll = Array.isArray(atomGraph?.nodes)
        ? (atomGraph!.nodes as unknown[]).map((n, i) => {
            const an = n as AtomNodeLike;
            const id = typeof an.id === "string" || typeof an.id === "number" ? (an.id as Id) : (i as Id);
            const fallback = String(id);
            let label = typeof an.label === "string" ? (an.label as string) : prettyNodeLabel(an, fallback);
            if (label === fallback) {
              const fromLinks = atomLabelLookup.get(id);
              if (fromLinks) label = fromLinks;
            }
            const role = typeof an.role === "string" ? (an.role as "A" | "R" | string) : undefined;
            return { id, label, role };
          })
        : [];
    }
    const used = new Set<Id>();
    for (const l of filtered) { used.add(l.source as Id); used.add(l.target as Id); }
    const nodes = showIsolated ? nodesAll : nodesAll.filter((n) => used.has(n.id));
    const nodeColors = computeNodeColors(nodes);
    return { nodes, links: filtered, presentPairsByTile, proxAvailable, nodeColors };
  }, [tab, resGraph, atomGraph, tiles, proxChecked, proxAng, showIsolated, atomLabelLookup, roleLookup]);

  // NGL apply (guarded to avoid infinite loops)
  type WithNglReps = {
    addRepresentation: (type: string, params?: Record<string, unknown>) => unknown;
    removeRepresentation: (rep: unknown) => void;
  };
  function hasNglReps(obj: unknown): obj is WithNglReps {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "addRepresentation" in obj &&
      typeof (obj as { addRepresentation?: unknown }).addRepresentation === "function" &&
      "removeRepresentation" in obj &&
      typeof (obj as { removeRepresentation?: unknown }).removeRepresentation === "function"
    );
  }

  // Signature ref to skip redundant updates
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    if (!component || !hasNglReps(component)) return;

    // Build selection string
    const buildSele = (): string | null => {
      if (cur.nodes.length === 0) return null;
      if (tab === "atom") {
        const ids = cur.nodes.map((n) => n.id).filter((x): x is number | string => x !== undefined && x !== null);
        const MAX_IDS = 1500; const trimmed = ids.slice(0, MAX_IDS);
        const parts = trimmed.map((id) => `@${id}`);
        return parts.length ? parts.join(" or ") : null;
      } else {
        const parts: string[] = [];
        for (const n of cur.nodes) {
          const label = n.label ?? String(n.id);
          const [chain, resno] = label.split("/");
          const c = chain?.trim(); const r = resno && /^\d+$/.test(resno.trim()) ? resno.trim() : null;
          if ((c === "A" || c === "R") && r) parts.push(`:${c} and ${r}`);
        }
        return parts.length ? Array.from(new Set(parts)).join(" or ") : null;
      }
    };
    const sele = buildSele();

    // Build signature
    const tileSig = TILE_ORDER.map((k) => {
      const st = tiles[k]?.pairs ?? { AA:false, AR:false, RR:false };
      return `${k}:${st.AA?1:0}${st.AR?1:0}${st.RR?1:0}`;
    }).join("|");
    const sig = JSON.stringify({
      sele,
      tileSig,
      prox: { on: proxChecked, ang: proxAng },
      linkCount: cur.links.length,
      tab,
    });
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    const comp = component as WithNglReps;

    // 1) highlight rep: remove old if exists, then set new directly (avoid null intermediate)
    if (highlightRep) {
      try { comp.removeRepresentation(highlightRep); } catch {}
    }
    if (!sele) {
      return;
    }
    const newRep = comp.addRepresentation("ball+stick", {
      sele, multipleBond: true, scale: 1.0, aspectRatio: 1.5,
    });
    setHighlightRep?.(newRep as NonNullable<typeof highlightRep>);

    // 2) link reps: compute new first, then remove old and set new once
    const byTile = buildAtomPairsByTile(cur.links as ResLink[], roleLookup);
    const newLinkReps: unknown[] = [];
    for (const [tile, pairs] of byTile.entries()) {
      if (!pairs.length) continue;
      const tileState = tiles[tile];
      const anyOn = tileState && (tileState.pairs.AA || tileState.pairs.AR || tileState.pairs.RR);
      if (!anyOn) continue;
      const color = TILE_COLORS[tile] ?? "#444444";
      const pairLimited = pairs.slice(0, 2500);
      const repLink = (comp).addRepresentation("distance", {
        atomPair: pairLimited, colorScheme: "uniform", colorValue: color, linewidth: 2, labelVisible: false,
      });
      newLinkReps.push(repLink);
    }
    if (linkReps && Array.isArray(linkReps)) {
      try { for (const r of linkReps) (comp).removeRepresentation(r); } catch {}
    }
    setLinkReps(newLinkReps);
  }, [component, cur.links, tiles, tab, roleLookup, proxChecked, proxAng, setHighlightRep, highlightRep, linkReps, cur.nodes.length]);

  const counts = { nodes: cur.nodes.length, links: cur.links.length };

  return (
    <div className="w-full grid grid-rows-[min-content_min-content_min-content_minmax(0,1fr)] gap-3 p-4">
      <FilterBar
        tiles={tiles}
        togglePair={togglePair}
        presentPairsByTile={cur.presentPairsByTile}
        proxAvailable={cur.proxAvailable}
        proxChecked={proxChecked}
        setProxChecked={setProxChecked}
        proxAng={proxAng}
        setProxAng={setProxAng}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className={`rounded-xl px-3 py-1 border ${tab === "res" ? "bg-gray-100" : "bg-white"}`} onClick={() => setTab("res")}>Residue Graph</button>
        <button className={`rounded-xl px-3 py-1 border ${tab === "atom" ? "bg-gray-100" : "bg-white"}`} onClick={() => setTab("atom")}>Atom Graph</button>
        <label className="ml-2 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showIsolated} onChange={(e) => setShowIsolated(e.target.checked)} />
          <span>고립 노드 표시</span>
        </label>
      </div>
      <div className="text-sm grid grid-cols-2 gap-2">
        <div className="rounded-xl border p-2 bg-white"><div className="font-semibold">nodes</div><div>{counts.nodes}</div></div>
        <div className="rounded-xl border p-2 bg-white"><div className="font-semibold">links</div><div>{counts.links}</div></div>
      </div>
      <div className="min-h-0 overflow-auto">
        <MiniForceGraph
          title={tab === "res" ? "Residue Force Graph" : "Atom Force Graph"}
          nodes={cur.nodes}
          links={cur.links}
          nodeColors={cur.nodeColors}
          onNodeClick={(n) => clog("Graph", "node-click", n)}
        />
      </div>
    </div>
  );
}

/* =============================
 * Fetch (auto, fixed to "test")
 * ===========================*/
function FetchPanel({ onGraphsLoaded }: { onGraphsLoaded?: (p: { atomGraph: AtomGraph | null; resGraph: ResGraph | null; }) => void; }) {
  const PDB_NAME = "test";
  const [loading, setLoading] = useState(false);
  const fetchedOnceRef = useRef(false);

  async function fetchAll() {
    setLoading(true);
    try {
      clog("FETCH", `Fetching for pdb=${PDB_NAME}`);
      const base = `/api`;

      const url2 = `${base}/atom-graph/${encodeURIComponent(PDB_NAME)}`;
      const r2 = await fetch(url2, { cache: "no-store", headers: { accept: "application/json" } });
      const d2 = r2.headers.get("content-type")?.includes("application/json") ? await r2.json() : await r2.text();
      const ag = typeof d2 === "object" ? (d2 as AtomGraph) : null;
      clog("FETCH", "atomGraph.counts", { nodes: Array.isArray(ag?.nodes) ? ag!.nodes!.length : null, links: countLinksUnknown(ag?.links ?? null) });

      const url3 = `${base}/res-graph/${encodeURIComponent(PDB_NAME)}`;
      const r3 = await fetch(url3, { cache: "no-store", headers: { accept: "application/json" } });
      const d3 = r3.headers.get("content-type")?.includes("application/json") ? await r3.json() : await r3.text();
      const rg = typeof d3 === "object" ? (d3 as ResGraph) : null;
      clog("FETCH", "resGraph.counts", { nodes: Array.isArray(rg?.nodes) ? rg!.nodes!.length : null, links: countLinksUnknown(rg?.links ?? null) });

      onGraphsLoaded?.({ atomGraph: ag, resGraph: rg });
    } catch (e) {
      clog("FETCH", "ERROR", e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch exactly once on mount
  useEffect(() => {
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;
    void fetchAll();
  }, []);

  return (
    <div className="w-full p-4">
      <div className="rounded-2xl border p-4 bg-white flex flex-wrap items-center gap-3">
        <div className="font-semibold">Load Graphs (fixed pdb: <code>{PDB_NAME}</code>)</div>
        <button className="rounded-xl px-4 py-2 border" onClick={fetchAll} disabled={loading}>
          {loading ? "Loading..." : "▶ Refetch"}
        </button>
      </div>
    </div>
  );
}

/* =============================
 * Page Layout
 * ===========================*/
function Inner() {
  const { stage, setStage, component, setComponent, defaultRep, setDefaultRep, highlightRep, setHighlightRep, lastSele, setLastSele } = useNgl();
  const [atomGraph, setAtomGraph] = useState<AtomGraph | null>(null);
  const [resGraph, setResGraph] = useState<ResGraph | null>(null);

  useEffect(() => clog("NGL", `stage ready=${!!stage}`), [stage]);
  useEffect(() => clog("NGL", `component ready=${!!component}`), [component]);

  return (
    <div className="w-full h-screen grid grid-cols-1 xl:grid-cols-[1fr_min(980px,48%)] gap-4 p-4 overflow-auto bg-gray-50">
      <div className="rounded-2xl border overflow-y-auto min-h-0 bg-white">
        <div className="w-full" style={{ height: 520 }}>
          <NglWebapp viewer={{ stage, setStage, component, setComponent, defaultRep, setDefaultRep, highlightRep, setHighlightRep, lastSele, setLastSele }} />
        </div>
        <div className="border-t p-2 text-xs opacity-70 sticky bottom-0 bg-white/90 backdrop-blur">
          좌측: NGL 뷰어 (test.pdb 자동 로드)
        </div>
      </div>
      <div className="rounded-2xl border overflow-hidden min-h-0 flex flex-col bg-white">
        <div className="min-h-0 overflow-auto border-b">
          <FetchPanel onGraphsLoaded={({ atomGraph: ag, resGraph: rg }) => { setAtomGraph(ag); setResGraph(rg); }} />
        </div>
        <div className="min-h-0 overflow-auto">
          <Panel atomGraph={atomGraph} resGraph={resGraph} />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <NglProvider>
      <Inner />
    </NglProvider>
  );
}
