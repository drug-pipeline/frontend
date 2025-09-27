// components/interaction/Graph.tsx
"use client";

import * as d3 from "d3";
import React from "react";

/** Accepts a payload structurally compatible with your current GraphPayload */
type InNode = { id: string; label: string; role: string };
type InLink = {
  source: string | number;
  target: string | number;
  type?: string;
  distance?: number;
  angle?: number;
};
type InPayload = { nodes: InNode[]; links: InLink[] };

type SimNode = InNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  _r?: number; // computed radius (by degree)
  _count?: number; // degree (visible links touching this node)
};
type SimLink = {
  source: SimNode | string;
  target: SimNode | string;
  distance?: number;
  type?: string;
  _pi?: number; // parallel index
  _pc?: number; // parallel count
};

const TYPE_HEX: Record<string, string> = {
  clash: "#e11d48",
  covalent: "#d97706",
  vdw_clash: "#c026d3",
  vdw: "#0284c7",
  proximal: "#65a30d",
  hbond: "#2563eb",
  weak_hbond: "#4f46e5",
  halogen_bond: "#0891b2",
  ionic: "#059669",
  metal_complex: "#0d9488",
  aromatic: "#7c3aed",
  hydrophobic: "#ea580c",
  carbonyl: "#b45309",
  polar: "#334155",
  weak_polar: "#3f3f46",
};

/**
 * New: dynamic role → color mapping.
 * - If roles include "A" or "R", we keep them as blue/red for consistency.
 * - Other roles get colors from a categorical palette, stable per render based on sorted role list.
 */
const ROLE_PALETTE = [
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#14b8a6", // teal-500
  "#ef4444", // red-500 (used for non-R roles only if R isn't present)
  "#3b82f6", // blue-500 (used for non-A roles only if A isn't present)
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#a855f7", // purple-500
  "#84cc16", // lime-500
  "#f43f5e", // rose-500
  "#0ea5e9", // sky-500
] as const;

function buildRoleColorMap(nodes: InNode[]): Record<string, string> {
  const roles = Array.from(new Set(nodes.map((n) => n.role))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  const map: Record<string, string> = {};
  // Reserve canonical colors for A/R if present
  const hasA = roles.includes("A");
  const hasR = roles.includes("R");
  if (hasA) map["A"] = "#60a5fa"; // sky-400
  if (hasR) map["R"] = "#f87171"; // red-400

  let paletteIndex = 0;
  for (const r of roles) {
    if (map[r]) continue;
    // Skip palette colors that would duplicate A/R hues if those were assigned
    let color = ROLE_PALETTE[paletteIndex % ROLE_PALETTE.length];
    paletteIndex += 1;
    // Avoid matching reserved A/R colors too closely (very rough check)
    if (hasA && (color === "#3b82f6" || color === "#0ea5e9")) {
      color = ROLE_PALETTE[paletteIndex % ROLE_PALETTE.length];
      paletteIndex += 1;
    }
    if (hasR && (color === "#ef4444" || color === "#f43f5e")) {
      color = ROLE_PALETTE[paletteIndex % ROLE_PALETTE.length];
      paletteIndex += 1;
    }
    map[r] = color;
  }

  console.log("[Graph role palette]", { roles, map });
  return map;
}

// Curved path for multi-edges
function curvedPath(d: SimLink): string {
  const sx = typeof d.source === "string" ? 0 : d.source.x ?? 0;
  const sy = typeof d.source === "string" ? 0 : d.source.y ?? 0;
  const tx = typeof d.target === "string" ? 0 : d.target.x ?? 0;
  const ty = typeof d.target === "string" ? 0 : d.target.y ?? 0;

  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const count = d._pc ?? 1;
  const idx = d._pi ?? 0;
  const k = idx - (count - 1) / 2;
  const offset = 12 * k;

  const cx = mx + nx * offset;
  const cy = my + ny * offset;

  return `M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`;
}

function MiniForceGraph({
  payload,
  showLabels,
  onFitRef,
}: {
  payload: InPayload;
  showLabels: boolean;
  /** parent passes a ref setter for the fit-to-screen handler */
  onFitRef: (fn: () => void) => void;
}) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const gRootNodeRef = React.useRef<SVGGElement | null>(null);
  const gLinksRef = React.useRef<SVGGElement | null>(null);
  const gNodesRef = React.useRef<SVGGElement | null>(null);

  const simRef = React.useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const nodeStore = React.useRef<Map<string, SimNode>>(new Map());

  // keep zoom behavior + dimensions for programmatic transforms
  const zoomRef = React.useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );
  const widthRef = React.useRef<number>(640);
  const heightRef = React.useRef<number>(420);

  // tooltip selection (HTML)
  const tooltipSelRef = React.useRef<
    d3.Selection<HTMLDivElement, unknown, null, undefined> | null
  >(null);

  // mount
  React.useEffect(() => {
    const svg = d3.select(svgRef.current as SVGSVGElement);
    const width = svgRef.current?.clientWidth ?? 640;
    const height = 420;

    widthRef.current = width;
    heightRef.current = height;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // base groups
    const g = svg.append("g").node() as SVGGElement;
    gRootNodeRef.current = g;

    const gSel = d3.select(g);
    gSel.append("g").attr("class", "__links");
    gSel.append("g").attr("class", "__nodes");
    gLinksRef.current = gSel.select<SVGGElement>("g.__links").node();
    gNodesRef.current = gSel.select<SVGGElement>("g.__nodes").node();

    // zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        d3.select(gRootNodeRef.current).attr(
          "transform",
          String(event.transform)
        );
      });
    zoomRef.current = zoom;

    svg.call(zoom);
    const initialScale = 0.4;
    const tx = (width - width * initialScale) / 2;
    const ty = (height - height * initialScale) / 2;
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(initialScale)
    );

    const sim = d3
      .forceSimulation<SimNode>()
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>()
          .id((d) => d.id)
          .distance((l) => l.distance ?? 140)
          .strength(0.7)
      )
      .force("charge", d3.forceManyBody<SimNode>().strength(-220).distanceMax(600))
      .force("collide", d3.forceCollide<SimNode>().radius(12).strength(0.8))
      .force("x", d3.forceX<SimNode>(width / 2).strength(0.05))
      .force("y", d3.forceY<SimNode>(height / 2).strength(0.05))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .velocityDecay(0.5);

    simRef.current = sim;

    // tooltip div
    const wrap = d3.select(wrapperRef.current as HTMLDivElement);
    wrap.selectAll<HTMLDivElement, unknown>("div.__tooltip").remove();
    const tooltip = wrap
      .append("div")
      .attr(
        "class",
        "__tooltip pointer-events-none absolute z-20 select-none rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow"
      )
      .style("opacity", 0);
    tooltipSelRef.current = tooltip;

    return () => {
      sim.stop();
      tooltip.remove();
    };
  }, []);

  // expose "fit to screen" action upward
  React.useEffect(() => {
    const fit = () => {
      const svgEl = svgRef.current;
      const zoom = zoomRef.current;
      const sim = simRef.current;
      if (!svgEl || !zoom || !sim) return;

      const nodes = sim.nodes() as SimNode[];
      if (!nodes.length) return;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      let maxR = 6;
      for (const n of nodes) {
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const r = n._r ?? 6;
        if (x - r < minX) minX = x - r;
        if (y - r < minY) minY = y - r;
        if (x + r > maxX) maxX = x + r;
        if (y + r > maxY) maxY = y + r;
        if (r > maxR) maxR = r;
      }

      const w = widthRef.current;
      const h = heightRef.current;

      // add padding
      const pad = Math.max(20, maxR + 10);
      const contentW = Math.max(1, maxX - minX + pad * 2);
      const contentH = Math.max(1, maxY - minY + pad * 2);

      const scale = Math.min(w / contentW, h / contentH) * 0.95;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const transform = d3.zoomIdentity
        .translate(w / 2, h / 2)
        .scale(scale)
        .translate(-cx, -cy);

      d3.select(svgEl).call(zoom.transform, transform);
    };

    onFitRef(fit);
  }, [onFitRef]);

  // update
  React.useEffect(() => {
    if (!gLinksRef.current || !gNodesRef.current || !simRef.current) return;

    // degree map
    const degree = new Map<string, number>();
    for (const l of payload.links) {
      const s = String(l.source);
      const t = String(l.target);
      degree.set(s, (degree.get(s) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
    }
    const baseR = 4;
    const stepR = 0.8;
    const maxR = 30;

    const incoming = new Map<string, SimNode>();
    for (const n of payload.nodes) {
      const kept = nodeStore.current.get(n.id);
      const deg = degree.get(n.id) ?? 0;
      const radius = Math.min(baseR + stepR * deg, maxR);
      const next: SimNode = kept
        ? { ...kept, ...n, _count: deg, _r: radius }
        : {
            ...n,
            x: Math.random() * 100 + 200,
            y: Math.random() * 60 + 180,
            _count: deg,
            _r: radius,
          };
      incoming.set(n.id, next);
    }
    for (const id of Array.from(nodeStore.current.keys()))
      if (!incoming.has(id)) nodeStore.current.delete(id);
    for (const [id, sn] of incoming.entries()) nodeStore.current.set(id, sn);

    const simNodes: SimNode[] = Array.from(nodeStore.current.values());
    const simNodeById = new Map(simNodes.map((n) => [n.id, n]));

    // build links
    const rawLinks: SimLink[] = payload.links.map((l) => ({
      source: simNodeById.get(String(l.source)) ?? String(l.source),
      target: simNodeById.get(String(l.target)) ?? String(l.target),
      distance: l.distance,
      type: l.type,
    }));

    const keyOf = (s: string, t: string) =>
      s < t ? `${s}__${t}` : `${t}__${s}`;
    const groups = new Map<string, SimLink[]>();
    for (const link of rawLinks) {
      const s = typeof link.source === "string" ? link.source : link.source.id;
      const t = typeof link.target === "string" ? link.target : link.target.id;
      const k = keyOf(s, t);
      const arr = groups.get(k) ?? [];
      arr.push(link);
      groups.set(k, arr);
    }
    for (const [, arr] of groups) {
      const c = arr.length;
      arr.forEach((lnk, i) => {
        lnk._pc = c;
        lnk._pi = i;
      });
    }
    const simLinks = rawLinks;

    // --- NEW: dynamic role → color map for current payload ---
    const roleColorMap = buildRoleColorMap(payload.nodes);

    // selections
    const gLinksSel = d3.select(gLinksRef.current);
    const linkSel = gLinksSel
      .selectAll<SVGPathElement, SimLink>("path.link")
      .data(simLinks, (d, i) => {
        const dl = d as SimLink;
        const s = typeof dl.source === "string" ? dl.source : dl.source.id;
        const t = typeof dl.target === "string" ? dl.target : dl.target.id;
        return `${s}__${t}__${dl._pi ?? 0}__${i}`;
      });

    linkSel.exit().transition().duration(180).style("opacity", 0).remove();

    const linkEnter = linkSel
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke-width", 1.8)
      .attr("stroke", (d) => TYPE_HEX[d.type ?? ""] ?? "#cbd5e1");

    const linkMerge = linkEnter
      .merge(
        linkSel as d3.Selection<SVGPathElement, SimLink, SVGGElement, unknown>
      )
      .attr("stroke", (d) => TYPE_HEX[d.type ?? ""] ?? "#cbd5e1");

    const gNodesSel = d3.select(gNodesRef.current);

    // circle
    const nodeSel = gNodesSel
      .selectAll<SVGCircleElement, SimNode>("circle.node")
      .data(simNodes, (d) => (d as SimNode).id);

    nodeSel.exit().transition().duration(180).attr("r", 0).style("opacity", 0).remove();

    const nodeEnter = nodeSel
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", 4)
      .attr("fill", (d) => roleColorMap[d.role] ?? "#94a3b8")
      .attr("stroke", "#374151")
      .attr("stroke-width", 1.5);

    nodeEnter.transition().duration(150).attr("r", (d) => d._r ?? 6);

    const nodeMerge = nodeEnter
      .merge(
        nodeSel as d3.Selection<SVGCircleElement, SimNode, SVGGElement, unknown>
      )
      .attr("fill", (d) => roleColorMap[d.role] ?? "#94a3b8")
      .attr("r", (d) => d._r ?? 6);

    // --- NEW: text labels ---
    const labelSel = gNodesSel
      .selectAll<SVGTextElement, SimNode>("text.label")
      .data(showLabels ? simNodes : [], (d) => (d as SimNode).id);

    labelSel.exit().remove();

    const labelEnter = labelSel
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("font-size", "10px")
      .attr("dx", 8)
      .attr("dy", ".35em")
      .attr("fill", "#374151")
      .text((d) => d.label);

    const labelMerge = labelEnter.merge(
      labelSel as d3.Selection<SVGTextElement, SimNode, SVGGElement, unknown>
    );

    // DRAG behavior — allow users to "touch" and move nodes
    const sim = simRef.current;
    const dragBehavior = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x ?? 0;
        d.fy = d.y ?? 0;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        // release fixed position so the layout can continue naturally
        d.fx = null;
        d.fy = null;
      });

    nodeMerge.call(dragBehavior as unknown as d3.DragBehavior<
      SVGCircleElement,
      SimNode,
      unknown
    >);

    // tick
    sim.force(
      "collide",
      d3.forceCollide<SimNode>().radius((d) => (d._r ?? 6) + 6).strength(1)
    );
    (sim.force("link") as d3.ForceLink<SimNode, SimLink>)
      .id((d) => d.id)
      .distance((l) => l.distance ?? 140)
      .strength(0.7)
      .links(simLinks);

    sim.nodes(simNodes).on("tick", () => {
      linkMerge.attr("d", (d) => curvedPath(d));
      nodeMerge.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      labelMerge
        .attr("x", (d) => d.x ?? 0)
        .attr("y", (d) => d.y ?? 0);
    });

    sim.alpha(0.28).alphaTarget(0.05).restart();
    const timeout = setTimeout(() => sim.alphaTarget(0), 400);
    return () => clearTimeout(timeout);
  }, [payload, showLabels]);

  return (
    <div ref={wrapperRef} className="relative">
      <svg
        ref={svgRef}
        className="h-96 w-full select-none rounded-md bg-zinc-50 ring-1 ring-inset ring-zinc-200"
      />
    </div>
  );
}

/** Public graph pane used by InteractionPanel */
export function GraphPane({
  filteredPayload,
  atomSummary,
  residueSummary,
}: {
  filteredPayload: InPayload;
  atomSummary: { nodes: number; links: number } | null;
  residueSummary: { nodes: number; links: number } | null;
}) {
  void atomSummary;
  void residueSummary;

  const [showLabels, setShowLabels] = React.useState(true);

  // Fit-to-screen handler is provided by MiniForceGraph
  const fitHandlerRef = React.useRef<() => void>(() => {});

  return (
    <section className="rounded-2xl bg-white">
      <div className="mb-2 flex justify-end gap-2">
        <button
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
          onClick={() => setShowLabels((s) => !s)}
        >
          {showLabels ? "Hide Labels" : "Show Labels"}
        </button>
        {/* NEW: Fit to screen button */}
        <button
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
          onClick={() => fitHandlerRef.current?.()}
        >
          Fit to screen
        </button>
      </div>
      <MiniForceGraph
        payload={filteredPayload}
        showLabels={showLabels}
        onFitRef={(fn) => {
          fitHandlerRef.current = fn;
        }}
      />
    </section>
  );
}

export default GraphPane;
