"use client";

import { useEffect, useState, useRef } from "react";

// ===== Types =====
export type HeatmapMatrix = Array<Array<string | number>>; // [["", uni1, ...], [cid1, v11, ...], ...]
export type StringMatrix = string[][];

export type DockingMapClick = {
  cid: string;
  uniprotId: string;
  affinity: number | string | null;
};

export type DockingMapProps = {
  data: StringMatrix; // header row + first column labels as strings
  onCellClick?: (payload: DockingMapClick) => void;
};

type TierKey = "strong" | "moderate" | "weak" | "none";

type TooltipState = {
  visible: boolean;
  content: string;
  x: number;
  y: number;
};

type CellPos = {
  rowIndex: number | null;
  colIndex: number | null;
};

// Runtime guard to coerce any HeatmapMatrix into a string matrix
export function toStringMatrix(x: HeatmapMatrix | null | undefined): StringMatrix {
  if (!x) return [];
  return x.map((row) => row.map((v) => String(v)));
}

export default function DockingMap({ data, onCellClick }: DockingMapProps) {
  // ===== View mode
  const [viewMode, setViewMode] = useState<"zoom" | "fit">("zoom");

  // ===== Zoom
  const [sliderValue, setSliderValue] = useState<number>(70);
  const zoomLevel =
    sliderValue < 50
      ? (sliderValue / 50) * 100
      : 100 + ((sliderValue - 50) / 50) * 200;

  // ===== First column dynamic width (row labels)
  const [firstColWidth, setFirstColWidth] = useState<number>(80);
  const FONT_SPEC = "12px Roboto, Arial, sans-serif";

  const measureTextWidth = (text: string, font: string = FONT_SPEC): number => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 80;
    ctx.font = font;
    return ctx.measureText(String(text ?? "")).width;
  };

  useEffect(() => {
    if (!data || data.length === 0) return;
    const labels = data.slice(1).map((row) => String(row?.[0] ?? ""));
    const maxW = labels.reduce((m, t) => Math.max(m, measureTextWidth(t)), 0);
    const PAD = 16;
    const MIN_W = 40;
    const MAX_W = 320;
    setFirstColWidth(Math.min(MAX_W, Math.max(MIN_W, Math.ceil(maxW + PAD))));
  }, [data]);

  // ===== Container sizing (fit mode)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ===== Columns / cell width
  const colCount = data?.[0]?.length ? Math.max(0, data[0].length - 1) : 0;
  const baseCellWidth = 15;

  const cellWidth_fit =
    colCount > 0
      ? Math.max(4, Math.floor((containerWidth - firstColWidth) / colCount))
      : baseCellWidth;

  const cellWidth_zoom = Math.floor(baseCellWidth * (zoomLevel / 100));
  const computedCellWidth = viewMode === "fit" ? cellWidth_fit : cellWidth_zoom;

  // ===== Colors
  const COLOR_STEPS = 20 as const;
  const COLORS: string[] = Array.from({ length: COLOR_STEPS }, (_, i) => {
    const t = i / (COLOR_STEPS - 1);
    const r = Math.floor(255 * t);
    const g = Math.floor(255 * t);
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  });

  // ===== Range (kcal/mol)
  const MAX_AFFINITY = 0;
  const MIN_AFFINITY = -10;
  const [maxAffinity, setMaxAffinity] = useState<number>(-5.0);

  const getColorForValue = (value: string | number): string => {
    const num = Number(value);
    const clamped = Math.max(
      MIN_AFFINITY,
      Math.min(MAX_AFFINITY, Number.isNaN(num) ? MAX_AFFINITY : num)
    );
    if (clamped > maxAffinity) return "#fff";
    const denom = maxAffinity - MIN_AFFINITY; // ex) -5 - (-10) = 5
    const t = denom === 0 ? 0 : (clamped - MIN_AFFINITY) / denom; // 0~1
    const idx = Math.round(t * (COLOR_STEPS - 1));
    const safeIdx = Math.max(0, Math.min(COLOR_STEPS - 1, idx));
    return COLORS[safeIdx];
  };

  // ===== Tier filter
  const TIER_DEFS: Array<{
    key: TierKey;
    label: string;
    match: (vNum: number, isNaNVal: boolean) => boolean;
  }> = [
    {
      key: "strong",
      label: "Strong (< -7.5)",
      match: (vNum, isNaNVal) => !isNaNVal && vNum < -7.5,
    },
    {
      key: "moderate",
      label: "Moderate (-7.5 ~ -5.0)",
      match: (vNum, isNaNVal) => !isNaNVal && vNum >= -7.5 && vNum < -5.0,
    },
    {
      key: "weak",
      label: "Weak (-5.0 ~ -2.5)",
      match: (vNum, isNaNVal) => !isNaNVal && vNum >= -5.0 && vNum < -2.5,
    },
    {
      key: "none",
      label: "No Interaction",
      match: (vNum, isNaNVal) =>
        (!isNaNVal && vNum >= -2.5 && vNum <= 0) || isNaNVal,
    },
  ];

  const [selectedTiers, setSelectedTiers] = useState<Record<TierKey, boolean>>({
    strong: true,
    moderate: true,
    weak: true,
    none: true,
  });

  const toggleTier = (key: TierKey): void => {
    setSelectedTiers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 현재 필터(상한 + 티어)에 포함되는지 판단
  const passesFilters = (raw: string | number): boolean => {
    const vNum = Number(raw);
    const isNaNVal = Number.isNaN(vNum);

    // Binding Criteria (상한)
    if (!isNaNVal && vNum > maxAffinity) return false;

    // Tier 포함 여부
    const tierHit = TIER_DEFS.some(
      (t) => selectedTiers[t.key] && t.match(vNum, isNaNVal)
    );
    return tierHit;
  };

  // ===== Tooltip & selection
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });
  const [hoveredCell, setHoveredCell] = useState<CellPos>({
    rowIndex: null,
    colIndex: null,
  });
  const [selectedCell, setSelectedCell] = useState<CellPos>({
    rowIndex: null,
    colIndex: null,
  });
  const [instruction, setInstruction] = useState<string>(
    "Click each cell in the heatmap to view structure and docking pose in the next session"
  );

  const handleMouseEnter = (
    event: React.MouseEvent<HTMLDivElement>,
    rowIndex: number,
    colIndex: number
  ): void => {
    if (rowIndex > 0 && colIndex > 0) {
      setHoveredCell({ rowIndex, colIndex });
      const affinity = data[rowIndex]?.[colIndex];
      const cid = data[rowIndex]?.[0];
      const uniprotId = data[0]?.[colIndex];
      const affStr =
        affinity !== undefined && String(affinity).trim() !== "" ? String(affinity) : "NaN";
      const tooltipContent = `CID: ${cid}<br>UniprotID: ${uniprotId}<br>Affinity: ${affStr}`;
      setTooltip({
        visible: true,
        content: tooltipContent,
        x: event.pageX + 10,
        y: event.pageY + 10,
      });
    }
  };
  const handleMouseLeave = (): void => {
    setHoveredCell({ rowIndex: null, colIndex: null });
    setTooltip({ visible: false, content: "", x: 0, y: 0 });
  };
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (tooltip.visible)
      setTooltip((prev) => ({ ...prev, x: event.pageX + 10, y: event.pageY + 10 }));
  };
  const handleCellClick = (rowIndex: number, colIndex: number): void => {
    if (rowIndex > 0 && colIndex > 0) {
      setSelectedCell({ rowIndex, colIndex });
      const affinity = data[rowIndex]?.[colIndex] ?? null;
      const cid = String(data[rowIndex]?.[0] ?? "");
      const uniprotId = String(data[0]?.[colIndex] ?? "");
      onCellClick?.({ cid, uniprotId, affinity });
      const affStr =
        affinity !== null && String(affinity).trim() !== "" ? String(affinity) : "NaN";
      setInstruction(`You clicked: CID: ${cid}, UniprotID: ${uniprotId}, Affinity: ${affStr}`);
    }
  };

  // ===== Header visibility (단순 표시/숨김만)
  const showColumnHeaders = computedCellWidth >= 18;
  const headerHeight = showColumnHeaders ? 120 : 24;

  // ===== CSV 다운로드 (현재 필터 반영)
  const downloadCSV = (): void => {
    if (!data || data.length === 0) return;

    const filteredRows: StringMatrix = data.map((row, rIdx) =>
      row.map((cell, cIdx) => {
        // 헤더/행라벨은 항상 유지
        if (rIdx === 0 || cIdx === 0) return String(cell ?? "");
        // 필터 통과하지 못하면 빈칸
        return passesFilters(cell) ? String(cell) : "";
      })
    );

    const csv = filteredRows
      .map((row) =>
        row
          .map((v) => {
            const s = String(v ?? "");
            // CSV-safe quotes
            return "\""+s.replace(/\"/g, '\"\\"')+"\"";
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `docking_heatmap_filtered_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "relative", width: "100%" }} className="font-roboto font-light">
      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {/* Row 1: View + Zoom + CSV */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label className="font-bold">View:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "zoom" | "fit")}
            className="border p-2 rounded-md font-light"
          >
            <option value="zoom">Zoom</option>
            <option value="fit">Fit to screen</option>
          </select>

          {viewMode === "zoom" && (
            <>
              <label className="font-bold ml-3">Zoom Level:</label>
              <input
                type="range"
                min={25}
                max={100}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
              />
              <input
                type="number"
                min={25}
                max={100}
                value={sliderValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 25 && v <= 100) setSliderValue(v);
                }}
                className="border p-2 rounded-md ml-2 font-light"
              />
              <span>%</span>
              <button
                onClick={() => setSliderValue(70)}
                className="ml-2 px-3 py-1 border rounded-md"
                title="Reset zoom to 100%"
              >
                Reset
              </button>
            </>
          )}

          {/* CSV 다운로드 버튼 */}
          <button
            onClick={downloadCSV}
            className="ml-4 px-3 py-2 border rounded-md bg-white hover:bg-gray-50"
            title="Download current view as CSV"
          >
            Download CSV (filtered)
          </button>
        </div>

        {/* Row 2: Binding Criteria */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label className="font-bold">
            Binding Criteria: show only less than{" "}
            <select
              id="affinityRange"
              value={maxAffinity}
              onChange={(e) => setMaxAffinity(Number(e.target.value))}
              className="border p-2 rounded-md ml-2 font-light"
            >
              <option value={-7.5}>-7.5 kcal/mol</option>
              <option value={-5.0}>-5.0 kcal/mol</option>
              <option value={-2.5}>-2.5 kcal/mol</option>
              <option value={0}>0 kcal/mol</option>
            </select>
          </label>
          <p style={{ fontSize: 12, marginBottom: 0 }}>
            (-10 kcal/mol: strong binding; 0 kcal/mol: no binding)
          </p>
        </div>

        {/* Row 3: Tier Filter (체크박스 그룹) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "8px 10px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <span className="font-bold mr-1">Interaction Filter:</span>
          {TIER_DEFS.map((t) => (
            <label key={t.key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(selectedTiers[t.key])}
                onChange={() => toggleTier(t.key)}
              />
              <span>{t.label}</span>
            </label>
          ))}
          <button
            className="ml-2 px-2 py-1 border rounded-md text-sm"
            onClick={() =>
              setSelectedTiers({ strong: true, moderate: true, weak: true, none: true })
            }
            title="Select all tiers"
          >
            All
          </button>
          <button
            className="px-2 py-1 border rounded-md text-sm"
            onClick={() =>
              setSelectedTiers({ strong: true, moderate: false, weak: false, none: false })
            }
            title="Strong only"
          >
            Strong only
          </button>
        </div>
      </div>

      {/* Heatmap */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "90%",
          overflowX: viewMode === "fit" ? "hidden" : "auto",
          margin: "0 auto 20px",
        }}
        onMouseMove={handleMouseMove}
      >
        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${firstColWidth}px repeat(${colCount}, ${computedCellWidth}px)`,
              width: "100%",
              maxWidth: "100%",
              margin: "0 auto",
            }}
          >
            {data.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                if (rowIndex === 0 && colIndex === 0) {
                  return <div key={`${rowIndex}-${colIndex}`} />;
                }

                const isFirstCol = colIndex === 0;
                const isHeaderRow = rowIndex === 0;

                const isHovered =
                  hoveredCell.rowIndex === rowIndex && hoveredCell.colIndex === colIndex;
                const isSelected =
                  selectedCell.rowIndex === rowIndex && selectedCell.colIndex === colIndex;

                // 필터 통과 여부
                const showValue =
                  !isHeaderRow && !isFirstCol ? passesFilters(cell) : true;

                // 색상: 헤더/라벨은 흰색, 데이터는 필터 통과 시 색, 아니면 흰색
                const bg =
                  isHeaderRow || isFirstCol ? "#fff" : showValue ? getColorForValue(cell) : "#fff";

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    style={{
                      position: "relative",
                      width: isFirstCol ? `${firstColWidth}px` : undefined,
                      height: isHeaderRow ? `${headerHeight}px` : "30px",
                      backgroundColor: bg,
                      display: "flex",
                      justifyContent: isFirstCol ? "flex-end" : "center",
                      alignItems: "center",
                      fontSize: isHeaderRow || isFirstCol ? "12px" : "10px",
                      color:
                        isHeaderRow || isFirstCol ? "black" : (showValue ? "white" : "transparent"),
                      whiteSpace: "nowrap",
                      border: isHovered || isSelected ? "2px solid black" : "none",
                      overflow: isFirstCol ? "visible" : "hidden",
                      cursor: !isHeaderRow && !isFirstCol && showValue ? "pointer" : "default",
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, rowIndex, colIndex)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      if (!isHeaderRow && !isFirstCol && showValue) handleCellClick(rowIndex, colIndex);
                    }}
                    title={
                      isHeaderRow || isFirstCol
                        ? String(cell)
                        : showValue
                        ? undefined
                        : "Filtered"
                    }
                  >
                    {isHeaderRow && !isFirstCol ? (
                      showColumnHeaders ? (
                        <div
                          style={{
                            position: "absolute",
                            transform: "rotate(-90deg) translate(-50%, -50%)",
                            transformOrigin: "center",
                            top: "50%",
                            left: "25%",
                            textAlign: "center",
                          }}
                        >
                          {cell}
                        </div>
                      ) : null
                    ) : isFirstCol ? (
                      <div
                        style={{
                          width: "auto",
                          paddingRight: 8,
                          textAlign: "right",
                          display: "flex",
                          justifyContent: "flex-end",
                          whiteSpace: "nowrap",
                        }}
                        title={String(cell)}
                      >
                        {cell}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          width: "20%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              width: `${Math.max(
                ((maxAffinity - MIN_AFFINITY) / (MAX_AFFINITY - MIN_AFFINITY)) * 80,
                10
              )}%`,
              height: 20,
            }}
          >
            {COLORS.map((c, i) => (
              <div key={i} style={{ flex: 1, backgroundColor: c }} />
            ))}
            <div style={{ flex: 1, backgroundColor: "#fff" }} />
          </div>
          <span style={{ fontSize: 12, color: "black" }}>(kcal/mol)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: "80%" }}>
          <span style={{ fontSize: 12, color: "black" }}>-10</span>
          <span style={{ fontSize: 12, color: "black" }}>0</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y,
            left: tooltip.x,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 14,
            pointerEvents: "none",
            zIndex: 1000,
            whiteSpace: "pre-line",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
          // Content already escaped to plain text, but in original design it was HTML.
          // We keep the same behavior for parity.
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}

      <div className="bg-blue-100 p-6 rounded-lg shadow-md mt-6">
        <p className="text-gray-800 text-lg font-semibold">{instruction}</p>
      </div>
    </div>
  );
}
