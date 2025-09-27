"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/** ====== Types ====== */
type MatrixCell = string | number | null | undefined;
type DataMatrix = MatrixCell[][]; // [row][col] with headers at [0][*] and [*][0]

type TierKey = "strong" | "moderate" | "weak" | "none";

type TierDef = {
  key: TierKey;
  label: string;
  match: (value: number, isNaNVal: boolean) => boolean;
};

type SelectedTiers = Record<TierKey, boolean>;

export type SelectivityMapClickPayload = {
  cid: string;
  uniprotId: string;
  affinity: number | string | null | undefined;
};

export type SelectivityMapProps = {
  /** 2D matrix. Header row in data[0], header column in data[*][0] */
  data: DataMatrix;
  /** Called when a non-header, visible cell is clicked */
  onCellClick?: (payload: SelectivityMapClickPayload) => void;
  /** Initial view mode (default: "zoom") */
  initialViewMode?: "zoom" | "fit";
  /** Initial zoom slider value (25~100, default: 70) */
  initialZoom?: number;
  /** Initial inhibition upper-bound (25|50|75|100, default: 50) */
  initialMaxAffinity?: 25 | 50 | 75 | 100;
};

const FONT_SPEC = "12px Roboto, Arial, sans-serif";
const COLOR_STEPS = 20;
const MAX_INHIBITION = 100;
const MIN_INHIBITION = 0;

const TIER_DEFS: TierDef[] = [
  { key: "strong",   label: "Strong (0–25%)",            match: (v, n) => !n && v >= 0  && v < 25 },
  { key: "moderate", label: "Moderate (25–50%)",         match: (v, n) => !n && v >= 25 && v < 50 },
  { key: "weak",     label: "Weak (50–75%)",             match: (v, n) => !n && v >= 50 && v < 75 },
  { key: "none",     label: "No effect (≥75% or NaN)",   match: (_v, n) => n || _v >= 75 },
];

/** Utility: robust number parsing */
function toNumber(val: MatrixCell): number {
  const num = typeof val === "number" ? val : Number(val);
  return Number.isFinite(num) ? num : NaN;
}

/** Utility: measure text width for first column auto width */
function measureTextWidth(text: MatrixCell, font: string = FONT_SPEC): number {
  if (typeof document === "undefined") return 80;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 80;
  ctx.font = font;
  return ctx.measureText(String(text ?? "")).width;
}

/** === Component === */
const SelectivityMap: React.FC<SelectivityMapProps> = ({
  data,
  onCellClick,
  initialViewMode = "zoom",
  initialZoom = 70,
  initialMaxAffinity = 50,
}) => {
  // View mode
  const [viewMode, setViewMode] = useState<"zoom" | "fit">(initialViewMode);

  // Zoom slider (only used in zoom mode)
  const [sliderValue, setSliderValue] = useState<number>(initialZoom);
  const zoomLevel = useMemo(() => {
    // original piecewise mapping; here simplified to linear (25~100)
    // keep the same numeric behavior the JS had for continuity:
    return sliderValue < 50
      ? (sliderValue / 50) * 100
      : 100 + ((sliderValue - 50) / 50) * 200;
  }, [sliderValue]);

  // First column dynamic width
  const [firstColWidth, setFirstColWidth] = useState<number>(80);
  useEffect(() => {
    if (!data || data.length === 0) return;
    const labels = data.slice(1).map((row) => String(row?.[0] ?? ""));
    const maxW = labels.reduce((m, t) => Math.max(m, measureTextWidth(t)), 0);
    const PAD = 16;
    const MIN_W = 40;
    const MAX_W = 320;
    setFirstColWidth(Math.min(MAX_W, Math.max(MIN_W, Math.ceil(maxW + PAD))));
  }, [data]);

  // Container sizing (for "fit" mode)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Derived counts
  const colCount = useMemo(
    () => (data?.[0]?.length ? Math.max(0, data[0].length - 1) : 0),
    [data]
  );

  // Computed cell width
  const baseCellWidth = 15;
  const cellWidth_fit =
    colCount > 0
      ? Math.max(4, Math.floor((containerWidth - firstColWidth) / colCount))
      : baseCellWidth;

  const cellWidth_zoom = Math.floor(baseCellWidth * (zoomLevel / 100));
  const computedCellWidth = viewMode === "fit" ? cellWidth_fit : cellWidth_zoom;

  // Color palette (light blue -> deep blue)
  const COLORS = useMemo(() => {
    return Array.from({ length: COLOR_STEPS }, (_, i) => {
      const intensity = i / (COLOR_STEPS - 1);
      const red = Math.floor(255 * intensity);
      const green = Math.floor(255 * intensity);
      const blue = 255;
      return `rgb(${red}, ${green}, ${blue})`;
    });
  }, []);

  // Affinity upper bound
  const [maxAffinity, setMaxAffinity] = useState<25 | 50 | 75 | 100>(initialMaxAffinity);

  const getColorForValue = (value: MatrixCell): string => {
    const num = toNumber(value);
    const clampedValue = Math.max(MIN_INHIBITION, Math.min(MAX_INHIBITION, Number.isNaN(num) ? 0 : num));
    const denom = Math.max(1, (maxAffinity === 100 ? 100 : maxAffinity) - MIN_INHIBITION);
    const t = (clampedValue - MIN_INHIBITION) / denom; // 0..1 across the visible range
    const idx = Math.round(t * (COLOR_STEPS - 1));
    return COLORS[Math.max(0, Math.min(COLOR_STEPS - 1, idx))];
  };

  // Tier filters
  const [selectedTiers, setSelectedTiers] = useState<SelectedTiers>({
    strong: true,
    moderate: true,
    weak: true,
    none: true,
  });

  const toggleTier = (key: TierKey) =>
    setSelectedTiers((p) => ({ ...p, [key]: !p[key] }));

  const passesFilters = (raw: MatrixCell): boolean => {
    const vNum = toNumber(raw);
    const isNaNVal = Number.isNaN(vNum);
    if (!isNaNVal && vNum > maxAffinity) return false;
    return TIER_DEFS.some((t) => selectedTiers[t.key] && t.match(vNum, isNaNVal));
  };

  // Tooltip & selection
  const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; x: number; y: number }>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });
  const [hoveredCell, setHoveredCell] = useState<{ rowIndex: number | null; colIndex: number | null }>({
    rowIndex: null,
    colIndex: null,
  });
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number | null; colIndex: number | null }>({
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
  ) => {
    if (rowIndex > 0 && colIndex > 0) {
      setHoveredCell({ rowIndex, colIndex });
      const val = data[rowIndex][colIndex];
      const cid = data[rowIndex][0];
      const uniprotId = data[0][colIndex];
      const num = toNumber(val);
      const tooltipContent = `CID: ${String(cid)}<br>UniprotID: ${String(uniprotId)}<br>% Inhibition: ${
        Number.isFinite(num) ? num.toFixed(2) : "NaN"
      }`;
      setTooltip({
        visible: true,
        content: tooltipContent,
        x: event.pageX + 10,
        y: event.pageY + 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell({ rowIndex: null, colIndex: null });
    setTooltip({ visible: false, content: "", x: 0, y: 0 });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (tooltip.visible) {
      setTooltip((p) => ({ ...p, x: event.pageX + 10, y: event.pageY + 10 }));
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (rowIndex > 0 && colIndex > 0) {
      setSelectedCell({ rowIndex, colIndex });
      const affinity = data[rowIndex][colIndex];
      const cid = data[rowIndex][0];
      const uniprotId = data[0][colIndex];
      onCellClick?.({ cid: String(cid), uniprotId: String(uniprotId), affinity });
      const num = toNumber(affinity);
      setInstruction(
        `You clicked: CID: ${String(cid)}, UniprotID: ${String(uniprotId)}, % Inhibition: ${
          Number.isFinite(num) ? num.toFixed(2) : "NaN"
        }`
      );
    }
  };

  // Label visibility
  const showColumnHeaders = computedCellWidth >= 18;
  const headerHeight = showColumnHeaders ? 120 : 24;

  // CSV (filtered)
  const downloadCSV = () => {
    if (!data || data.length === 0) return;
    const filtered = data.map((row, r) =>
      row.map((cell, c) => (r === 0 || c === 0 ? cell : passesFilters(cell) ? cell : ""))
    );
    const csv = filtered
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const utf8WithBom = "\uFEFF" + csv; // ensure Excel-friendly UTF-8
    const blob = new Blob([utf8WithBom], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `selectivity_heatmap_filtered_${ts}.csv`;
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
              <label htmlFor="zoomLevel" className="font-bold ml-3">
                Zoom Level:
              </label>
              <input
                id="zoomLevel"
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

          {/* CSV button */}
          <button
            onClick={downloadCSV}
            className="ml-4 px-3 py-2 border rounded-md bg-white hover:bg-gray-50"
            title="Download current view as CSV"
          >
            Download CSV (filtered)
          </button>
        </div>

        {/* Row 2: upper bound */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label className="font-bold">
            Binding Criteria: Show only compounds with less than{" "}
            <select
              id="affinityRange"
              value={maxAffinity}
              onChange={(e) => setMaxAffinity(Number(e.target.value) as 25 | 50 | 75 | 100)}
              className="border p-2 rounded-md ml-2 font-light"
            >
              <option value={25}>25%</option>
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>100%</option>
            </select>{" "}
            inhibition
          </label>
          <p style={{ fontSize: 12, marginBottom: 0 }}>
            (0% inhibition: complete inhibition; 100% inhibition: no inhibition)
          </p>
        </div>

        {/* Row 3: tier filter */}
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
                checked={!!selectedTiers[t.key]}
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
        {!!data?.length && (
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

                const showValue =
                  !isHeaderRow && !isFirstCol ? passesFilters(cell) : true;

                const bg =
                  isHeaderRow || isFirstCol ? "#fff" : showValue ? getColorForValue(cell) : "#fff";

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    style={{
                      position: "relative",
                      width: isFirstCol ? `${firstColWidth}px` : undefined,
                      height: isHeaderRow ? `${headerHeight}px` : "20px",
                      backgroundColor: bg,
                      display: "flex",
                      justifyContent: isFirstCol ? "flex-end" : "center",
                      alignItems: "center",
                      fontSize: isHeaderRow || isFirstCol ? "12px" : "10px",
                      color:
                        isHeaderRow || isFirstCol
                          ? "black"
                          : showValue
                          ? "white"
                          : "transparent",
                      whiteSpace: "nowrap",
                      border: isHovered || isSelected ? "2px solid black" : "none",
                      overflow: isFirstCol ? "visible" : "hidden",
                      cursor:
                        !isHeaderRow && !isFirstCol && showValue ? "pointer" : "default",
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, rowIndex, colIndex)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      if (!isHeaderRow && !isFirstCol && showValue) {
                        handleCellClick(rowIndex, colIndex);
                      }
                    }}
                    title={
                      isHeaderRow || isFirstCol ? String(cell) : showValue ? undefined : "Filtered"
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
                          {String(cell)}
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
                          fontSize: computedCellWidth < 10 ? 10 : 12,
                        }}
                        title={String(cell)}
                      >
                        {String(cell)}
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
              width: `${maxAffinity === 100 ? "80%" : `${(maxAffinity / 100) * 80}%`}`,
              height: 20,
            }}
          >
            {COLORS.map((c, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} style={{ flex: 1, backgroundColor: c }} />
            ))}
            <div style={{ flex: 1, backgroundColor: "#fff" }} />
          </div>
          <span style={{ fontSize: 12, color: "black" }}>(% inhibition)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: "80%" }}>
          <span style={{ fontSize: 12, color: "black" }}>0</span>
          <span style={{ fontSize: 12, color: "black" }}>100</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y,
            left: tooltip.x,
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 14,
            pointerEvents: "none",
            zIndex: 1000,
            whiteSpace: "pre-line",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
          // safe: only our own string (no user HTML)
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}

      <div className="bg-blue-100 p-6 rounded-lg shadow-md mt-6">
        <p className="text-gray-800 text-lg font-semibold">{instruction}</p>
      </div>
    </div>
  );
};

export default SelectivityMap;
