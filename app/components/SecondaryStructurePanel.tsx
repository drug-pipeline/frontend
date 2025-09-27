// /app/components/SecondaryStructurePanel.tsx
"use client";

import { useCallback, useEffect, useRef } from "react";

type ViewerStateLike = {
  stage: NGL.Stage | null;
  component: NGL.StructureComponent | null;

  // ✅ NglWebapp/useViewerState와 키 이름 통일
  defaultRep: NGL.Representation | null;
  setDefaultRep?: (rep: NGL.Representation | null) => void;

  highlightRep: NGL.Representation | null;
  setHighlightRep?: (rep: NGL.Representation | null) => void;

  lastSele: string | null;
  setLastSele?: (sele: string | null) => void;
};

type Props = {
  viewer: ViewerStateLike;
  className?: string;
  minHeightPx?: number;
};

type ChainResidue = {
  residueName: string;
  residueIndex: number;
  chainId: string;
  ssType: "Alpha Helix" | "Beta Sheet" | "Coil" | "Water" | "Compound";
};

type GroupRegion = {
  id: string;
  chainId: string;
  ssType: ChainResidue["ssType"];
  residues: ChainResidue[];
  segments: Array<{ x: number; y: number; width: number }>;
  highlighted: boolean;
};

export default function SecondaryStructurePanel({
  viewer,
  className,
  minHeightPx = 220,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  // 원본 window.* 대체
  const chainMapRef = useRef<Record<string, ChainResidue[]>>({});
  const groupRegionsRef = useRef<GroupRegion[]>([]);
  const highlightedMapRef = useRef<Record<string, boolean>>({});

  /** structure → chainMap */
  const computeChainMap = useCallback(() => {
    const comp = viewer.component;
    if (!comp) return {};

    const chainMap: Record<string, ChainResidue[]> = {};
    comp.structure.eachResidue((res) => {
      const residueName = res.resname || "Unknown";
      const residueIndex = res.resno;
      const chainId = res.chainname || "A";

      let ssType: ChainResidue["ssType"];
      if (residueName === "HOH") ssType = "Water";
      else if (!res.isProtein() && !res.isNucleic()) ssType = "Compound";
      else if (res.isHelix()) ssType = "Alpha Helix";
      else if (res.isSheet()) ssType = "Beta Sheet";
      else ssType = "Coil";

      (chainMap[chainId] ||= []).push({
        residueName,
        residueIndex,
        chainId,
        ssType,
      });
    });

    return chainMap;
  }, [viewer.component]);

  /** 레이아웃 계산 */
  const computeLayout = useCallback(() => {
    const screenW = Math.floor((window.innerWidth || 1200) * 0.8);
    const w = window.innerWidth || 1200;
    let residueWidth = screenW / 100;
    let maxPerRow = 100;

    if (w < 500) { residueWidth = screenW / 10; maxPerRow = 10; }
    else if (w < 750) { residueWidth = screenW / 15; maxPerRow = 15; }
    else if (w < 1000) { residueWidth = screenW / 20; maxPerRow = 20; }
    else if (w < 1400) { residueWidth = screenW / 30; maxPerRow = 30; }
    else if (w < 1700) { residueWidth = screenW / 40; maxPerRow = 40; }
    else if (w < 2000) { residueWidth = screenW / 50; maxPerRow = 50; }
    else if (w < 2300) { residueWidth = screenW / 60; maxPerRow = 60; }
    else if (w < 2600) { residueWidth = screenW / 70; maxPerRow = 70; }
    else if (w < 2900) { residueWidth = screenW / 80; maxPerRow = 80; }
    else if (w < 3200) { residueWidth = screenW / 90; maxPerRow = 90; }

    return {
      screenW,
      residueWidth,
      maxPerRow,
      rowSpacing: 85,
      startX: 20,
      baseY0: 80,
    };
  }, []);

  /** draw */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chainMap = chainMapRef.current;
    const { screenW, residueWidth, maxPerRow, rowSpacing, startX, baseY0 } =
      computeLayout();

    const chains = Object.keys(chainMap);
    const totalResidues = Object.values(chainMap).reduce((s, arr) => s + arr.length, 0);
    const totalRows = Math.ceil(totalResidues / maxPerRow) + chains.length;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = (screenW + 80) * dpr;
    canvas.height = Math.max(totalRows * rowSpacing + 100, minHeightPx) * dpr;
    canvas.style.width = `${screenW + 80}px`;
    canvas.style.height = `${Math.max(totalRows * rowSpacing + 100, minHeightPx)}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const aminoAcidMap: Record<string, string> = {
      ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C",
      GLU: "E", GLN: "Q", GLY: "G", HIS: "H", ILE: "I",
      LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P",
      SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V",
      HSD: "H", HSE: "H", HSP: "H", HOH: "HOH",
    };

    const groupRegions: GroupRegion[] = [];
    let baseY = baseY0;

    const drawArrow = (startX: number, y: number, endX: number) => {
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.moveTo(startX, y - 7);
      ctx.lineTo(endX - 15, y - 7);
      ctx.lineTo(endX - 15, y - 15);
      ctx.lineTo(endX, y);
      ctx.lineTo(endX - 15, y + 15);
      ctx.lineTo(endX - 15, y + 7);
      ctx.lineTo(startX, y + 7);
      ctx.closePath();
      ctx.fill();
    };

    const drawSquare = (startX: number, y: number, width: number) => {
      ctx.fillStyle = "yellow";
      ctx.fillRect(startX, y - 7, width, 14);
    };

    const finalizeGroup = (g: GroupRegion, chainId: string) => {
      g.id = `${chainId}:${g.residues[0].residueIndex}-${g.residues[g.residues.length - 1].residueIndex}`;
      g.highlighted = !!highlightedMapRef.current[g.id];
      groupRegions.push(g);

      if (g.ssType === "Beta Sheet" && g.segments.length > 0) {
        g.segments.forEach((seg, idx) => {
          ctx.save();
          ctx.globalAlpha = 1;
          if (g.segments.length === 1 || idx === g.segments.length - 1) {
            drawArrow(seg.x, seg.y, seg.x + seg.width);
          } else {
            drawSquare(seg.x, seg.y, seg.width);
          }
          ctx.restore();
        });
      }
    };

    for (const chainId of chains) {
      const residues = chainMap[chainId];
      const chainStartY = baseY;

      ctx.fillStyle = "black";
      ctx.font = "bold 16px Arial";
      ctx.fillText(`Chain ${chainId}`, startX, chainStartY - 60);

      let currentGroup: GroupRegion | null = null;
      let currentRowIndex = -1;

      for (let i = 0; i < residues.length; i++) {
        const residue = residues[i];
        const rowIndex = Math.floor(i / maxPerRow);
        const x = startX + (i % maxPerRow) * residueWidth;
        const y = chainStartY + rowIndex * rowSpacing;

        // 라벨
        ctx.fillStyle = "black";
        ctx.font = "11px Arial";
        const code = aminoAcidMap[residue.residueName] || residue.residueName;
        ctx.fillText(code, x, y - 30);
        ctx.fillText(String(residue.residueIndex), x, y - 15);

        // 도형
        if (residue.ssType === "Alpha Helix") {
          ctx.strokeStyle = "red";
          ctx.lineWidth = 7;
          ctx.beginPath();
          for (let j = 0; j < residueWidth; j++) {
            const waveY = y + Math.sin((j / residueWidth) * Math.PI * 2.05) * 10;
            ctx.lineTo(x + j, waveY);
          }
          ctx.stroke();
        } else if (residue.ssType === "Coil") {
          ctx.strokeStyle = "gray";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + residueWidth, y);
          ctx.stroke();
        } else if (residue.ssType === "Water") {
          ctx.fillStyle = "blue";
          ctx.beginPath();
          ctx.arc(x + residueWidth / 2, y, 7, 0, 2 * Math.PI);
          ctx.fill();
        } else if (residue.ssType === "Compound") {
          ctx.fillStyle = "gray";
          ctx.beginPath();
          ctx.arc(x + residueWidth / 2, y, 7, 0, 2 * Math.PI);
          ctx.fill();
        }

        // 그룹 결합
        if (!currentGroup || currentGroup.ssType !== residue.ssType) {
          if (currentGroup) finalizeGroup(currentGroup, chainId);
          currentGroup = {
            id: "",
            chainId,
            ssType: residue.ssType,
            residues: [residue],
            segments: [{ x, y, width: residueWidth }],
            highlighted: false,
          };
          currentRowIndex = rowIndex;
        } else {
          if (rowIndex === currentRowIndex) {
            const last = currentGroup.segments[currentGroup.segments.length - 1];
            last.width += residueWidth;
          } else {
            currentGroup.segments.push({ x, y, width: residueWidth });
            currentRowIndex = rowIndex;
          }
          currentGroup.residues.push(residue);
        }
      }
      if (currentGroup) finalizeGroup(currentGroup, chainId);

      const chainRows = Math.ceil(residues.length / maxPerRow);
      baseY += chainRows * rowSpacing + 50;
    }

    groupRegionsRef.current = groupRegions;

    // 하이라이트 오버레이
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "blue";
    for (const g of groupRegions) {
      if (!g.highlighted) continue;
      for (const seg of g.segments) {
        ctx.fillRect(seg.x, seg.y - 40, seg.width, 60);
      }
    }
    ctx.restore();
  }, [computeLayout, minHeightPx]);

  /** 클릭: BFS 확장 + 3D 하이라이트 토글 */
  const onClick = useCallback((ev: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !viewer.component) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    let clicked: GroupRegion | null = null;
    outer: for (const g of groupRegionsRef.current) {
      for (const seg of g.segments) {
        if (mx >= seg.x && mx <= seg.x + seg.width && my >= seg.y - 40 && my <= seg.y + 20) {
          clicked = g;
          break outer;
        }
      }
    }
    if (!clicked) return;

    const sameTypeResidues = groupRegionsRef.current
      .filter(r => r.residues.length &&
        r.residues[0].chainId === clicked!.residues[0].chainId &&
        r.residues[0].ssType === clicked!.residues[0].ssType)
      .flatMap(r => r.residues);

    const visited: Record<number, boolean> = {};
    const q: ChainResidue[] = [];
    for (const r of clicked.residues) { visited[r.residueIndex] = true; q.push(r); }
    while (q.length) {
      const cur = q.shift()!;
      for (const c of sameTypeResidues) {
        if (!visited[c.residueIndex] && Math.abs(c.residueIndex - cur.residueIndex) === 1) {
          visited[c.residueIndex] = true;
          q.push(c);
        }
      }
    }
    const extended = sameTypeResidues.filter(r => visited[r.residueIndex]);
    const sele = extended.map(r => `${r.residueIndex}:${r.chainId}`).join(" or ");

    const repSelect = document.getElementById("representationSelect") as HTMLSelectElement | null;
    let repType = repSelect?.value || "cartoon";
    if (repType === "cartoon" && (extended.length <= 3 || extended[0].ssType === "Water" || extended[0].ssType === "Compound")) {
      repType = "ball+stick";
    }

    // 같은 sele면 해제
    if (viewer.lastSele === sele) {
      viewer.highlightRep?.dispose();
      viewer.setHighlightRep?.(null);
      viewer.defaultRep?.setParameters({ opacity: 1.0 });
      viewer.setLastSele?.(null);
    } else {
      viewer.highlightRep?.dispose();
      const rep = viewer.component.addRepresentation(repType, {
        sele,
        color: "blue",
        opacity: 1.0,
      });
      viewer.setHighlightRep?.(rep);
      viewer.defaultRep?.setParameters({ opacity: 0.3 });
      viewer.setLastSele?.(sele);
    }

    // 파란 박스 단일선택
    const id = clicked.id;
    const m = highlightedMapRef.current;
    for (const k of Object.keys(m)) m[k] = false;
    m[id] = !m[id];

    draw();
  }, [viewer, draw]);

  /** 데이터 준비 + 드로우 트리거 */
  const refresh = useCallback(() => {
    chainMapRef.current = computeChainMap();
    draw();
  }, [computeChainMap, draw]);

  // 구조가 바뀔 때마다 다시 그림
  useEffect(() => {
    refresh();
  }, [viewer.component, refresh]);

  // 리사이즈 + 클릭 바인딩
  useEffect(() => {
    const onWin = () => { viewer.stage?.handleResize(); draw(); };
    window.addEventListener("resize", onWin);

    const host = hostRef.current;
    const ro = new ResizeObserver(() => { viewer.stage?.handleResize(); draw(); });
    if (host) ro.observe(host);

    const cvs = canvasRef.current;
    cvs?.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("resize", onWin);
      ro.disconnect();
      cvs?.removeEventListener("click", onClick);
    };
  }, [draw, onClick, viewer.stage]);

  return (
    <div ref={hostRef} className={className ?? "w-full overflow-auto"}>
      <h3 className="mb-2 text-base font-medium">Secondary Structure</h3>
      <canvas id="secondaryStructureCanvas" ref={canvasRef} />
    </div>
  );
}
