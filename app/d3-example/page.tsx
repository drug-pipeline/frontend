// app/d3-abc/page.tsx
"use client";

import * as d3 from "d3";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Id = "A" | "B" | "C";

type FGNode = {
  id: Id;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

type FGLink = {
  source: Id | FGNode;
  target: Id | FGNode;
  distance?: number;
};

const RADIUS = 10;

export default function D3ABCTogglePage(): React.JSX.Element {
  const [showC, setShowC] = useState(false);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        D3 Force Graph (A–B, A–C), Toggle C
      </h1>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={showC}
          onChange={(e) => setShowC(e.target.checked)}
        />
        <span>Show node C</span>
      </label>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 8,
        }}
      >
        <MiniForceABCToggle showC={showC} />
      </div>
    </div>
  );
}

function MiniForceABCToggle({ showC }: { showC: boolean }): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simRef = useRef<d3.Simulation<FGNode, FGLink> | null>(null);

  // 이전 좌표 보존(간단 헬퍼만 유지)
  const lastPosRef = useRef<Map<Id, { x: number; y: number; vx: number; vy: number }>>(
    new Map()
  );

  const { nodes, links } = useMemo(() => {
    const nodes: FGNode[] = [{ id: "A" }, { id: "B" }];
    const links: FGLink[] = [{ source: "A", target: "B", distance: 80 }];
    if (showC) {
      nodes.push({ id: "C" });
      links.push({ source: "A", target: "C", distance: 80 });
    }
    return { nodes, links };
  }, [showC]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = svgEl.clientWidth || 640;
    const height = 400;

    const svg = d3.select(svgEl);
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // 그룹은 필요 시 생성(select → empty면 append)
    const gLinks = svg.select<SVGGElement>("g.links").empty()
      ? svg.append("g").attr("class", "links").attr("stroke", "#9ca3af").attr("stroke-width", 1.2)
      : svg.select<SVGGElement>("g.links");

    const gNodes = svg.select<SVGGElement>("g.nodes").empty()
      ? svg.append("g").attr("class", "nodes")
      : svg.select<SVGGElement>("g.nodes");

    // 시뮬레이션 최초 1회 생성
    if (!simRef.current) {
      simRef.current = d3
        .forceSimulation<FGNode>()
        .force(
          "link",
          d3.forceLink<FGNode, FGLink>()
            .id((d) => d.id)
            .distance((l) => l.distance ?? 80)
        )
        .force("charge", d3.forceManyBody<FGNode>().strength(-140))
        .force("center", d3.forceCenter(width / 2, height / 2));
    }
    const sim = simRef.current;

    // === 좌표 전달(최소화)
    const carryPositions = (list: FGNode[]) => {
      for (const n of list) {
        const prev = lastPosRef.current.get(n.id);
        if (prev) {
          n.x = prev.x;
          n.y = prev.y;
          n.vx = prev.vx;
          n.vy = prev.vy;
        }
      }
    };
    carryPositions(nodes);

    // C가 새로 나올 때 A 근처에서 살짝 시작
    if (showC) {
      const a = nodes.find((n) => n.id === "A");
      const c = nodes.find((n) => n.id === "C");
      if (a && c && (c.x === undefined || c.y === undefined)) {
        const ax = a.x ?? width / 2;
        const ay = a.y ?? height / 2;
        c.x = ax + (Math.random() * 2 - 1) * 12;
        c.y = ay + (Math.random() * 2 - 1) * 12;
      }
    }

    // === 링크 조인 (join 패턴으로 간결화)
    const linkKey = (l: FGLink) => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      return `${s}→${t}`;
    };

    const linkSel = gLinks
      .selectAll<SVGLineElement, FGLink>("line")
      .data(links, linkKey);

    linkSel.join(
      (enter) =>
        enter
          .append("line")
          .attr("stroke", "#a3a3a3")
          .style("opacity", showC ? 0 : 1)
          .call((sel) => {
            if (showC) sel.transition().duration(300).style("opacity", 1);
          }),
      (update) => update,
      (exit) =>
        showC
          ? exit.transition().duration(300).style("opacity", 0).remove()
          : exit.remove() // 해제 시 즉시 제거(애니메이션 없음)
    );

    // === 노드 조인 (join 패턴)
    const nodeSel = gNodes
      .selectAll<SVGCircleElement, FGNode>("circle")
      .data(nodes, (d) => d.id);

    const nodeFill = (d: FGNode) =>
      d.id === "A" ? "#60a5fa" : d.id === "B" ? "#f87171" : "#34d399";

    const nodeMerge = nodeSel.join(
      (enter) =>
        enter
          .append("circle")
          .attr("r", showC ? 0 : RADIUS)
          .attr("fill", nodeFill)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)
          .style("opacity", showC ? 0 : 1)
          .call((sel) => {
            if (showC) {
              sel.transition().duration(300).attr("r", RADIUS).style("opacity", 1).ease(d3.easeCubicOut);
            }
          }),
      (update) => update.attr("fill", nodeFill),
      (exit) =>
        showC
          ? exit.transition().duration(250).attr("r", 0).style("opacity", 0).remove()
          : exit.remove()
    );

    // === 시뮬레이션 업데이트
    sim.nodes(nodes);
    (sim.force("link") as d3.ForceLink<FGNode, FGLink>).links(links);

    // C 등장 땐 조금만 흔들고, 해제 땐 거의 안 흔들리게
    showC ? sim.alphaTarget(0.2).alpha(0.7).restart() : sim.alphaTarget(0).alpha(0.05).restart();

    sim.on("tick", () => {
      gLinks
        .selectAll<SVGLineElement, FGLink>("line")
        .attr("x1", (d) => (typeof d.source === "string" ? 0 : d.source.x ?? 0))
        .attr("y1", (d) => (typeof d.source === "string" ? 0 : d.source.y ?? 0))
        .attr("x2", (d) => (typeof d.target === "string" ? 0 : d.target.x ?? 0))
        .attr("y2", (d) => (typeof d.target === "string" ? 0 : d.target.y ?? 0));

      nodeMerge
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);

      // 좌표 저장
      lastPosRef.current.clear();
      for (const n of nodes) {
        lastPosRef.current.set(n.id, {
          x: n.x ?? 0,
          y: n.y ?? 0,
          vx: n.vx ?? 0,
          vy: n.vy ?? 0,
        });
      }
    });

    // 언마운트 시 자연 정리(별도 stop 불필요)
  }, [nodes, links, showC]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: 400, display: "block", background: "#fafafa", borderRadius: 8 }}
    />
  );
}
