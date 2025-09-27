"use client";

import React, { useState } from "react";

/* =========================
   Types
   ========================= */

type TooltipButtonProps = {
  /** 각 줄의 텍스트. "divider"는 구분선으로 렌더링됨 */
  tooltipLines: string[];
};

type DotProps = {
  style?: React.CSSProperties;
};

/** ADMET 지표 데이터 (필드가 비어있을 수 있으므로 모두 optional) */
export interface AdmetData {
  molecular_weight?: number;
  logP?: number;
  hydrogen_bond_acceptors?: number;
  hydrogen_bond_donors?: number;
  Lipinski?: number;
  QED?: number;
  stereo_centers?: number;
  tpsa?: number;

  BBB_Martins?: number;
  PPBR_AZ?: number;
  VDss_Lombardo?: number;

  Half_Life_Obach?: number;
  Clearance_Hepatocyte_AZ?: number;
  Clearance_Microsome_AZ?: number;

  HIA_Hou?: number;
  Bioavailability_Ma?: number;
  Solubility_AqSolDB?: number;
  Lipophilicity_AstraZeneca?: number;
  HydrationFreeEnergy_FreeSolv?: number;
  Caco2_Wang?: number;
  PAMPA_NCATS?: number;
  Pgp_Broccatelli?: number;

  CYP1A2_Veith?: number;
  CYP2C19_Veith?: number;
  CYP2C9_Veith?: number;
  CYP2D6_Veith?: number;
  CYP3A4_Veith?: number;

  CYP2C9_Substrate_CarbonMangels?: number;
  CYP2D6_Substrate_CarbonMangels?: number;
  CYP3A4_Substrate_CarbonMangels?: number;

  hERG?: number;
  ClinTox?: number;
  AMES?: number;
  DILI?: number;
  Carcinogens_Lagunin?: number;
  LD50_Zhu?: number;
  Skin_Reaction?: number;

  // 하이픈이 포함된 키들
  ["NR-AR"]?: number;
  ["NR-AR-LBD"]?: number;
  ["NR-AhR"]?: number;
  ["NR-Aromatase"]?: number;
  ["NR-ER"]?: number;
  ["NR-ER-LBD"]?: number;
  ["NR-PPAR-gamma"]?: number;
  ["SR-ARE"]?: number;
  ["SR-ATAD5"]?: number;
  ["SR-HSE"]?: number;
  ["SR-MMP"]?: number;
  ["SR-p53"]?: number;
}

export interface ADMETProps {
  cid?: string | number;
  smiles?: string;
  data?: AdmetData;
}

/* =========================
   Helpers
   ========================= */

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const fmt2 = (v?: number) => (isNum(v) ? v.toFixed(2) : "—");

/** 삼색 신호용 헬퍼 */
const triColor = (v?: number, t1?: number, t2?: number, order: "asc" | "desc" = "asc") => {
  if (!isNum(v) || !isNum(t1) || !isNum(t2)) return "transparent";
  if (order === "asc") {
    // 낮음(빨강) -> 중간(노랑) -> 높음(초록)
    if (v < t1) return "red";
    if (v < t2) return "yellow";
    return "green";
  } else {
    // 높음(빨강) -> 중간(노랑) -> 낮음(초록)
    if (v > t2) return "red";
    if (v > t1) return "yellow";
    return "green";
  }
};

/* =========================
   UI Components
   ========================= */

function TooltipButton({ tooltipLines }: TooltipButtonProps) {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  }>({ visible: false, content: "", x: 0, y: 0 });

  const buildContent = (lines: string[]) =>
    lines
      .map((line) =>
        line === "divider"
          ? '<hr style="border-top: 1px solid rgba(255,255,255,0.5); margin: 4px 0;" />'
          : `<div>${line}</div>`
      )
      .join("");

  const updatePosition = (pageX: number, pageY: number, visibleContent?: string) => {
    const tooltipWidth = 200;
    const tooltipHeight = 100;
    const padding = 10;

    let x = pageX + 10;
    let y = pageY + 10;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (x + tooltipWidth > vw - padding) x = vw - tooltipWidth - padding;
    if (y + tooltipHeight > vh - padding) y = pageY - tooltipHeight - padding;

    setTooltip((prev) => ({
      visible: true,
      content: visibleContent ?? prev.content,
      x,
      y,
    }));
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={(e) => updatePosition(e.pageX, e.pageY, buildContent(tooltipLines))}
      onMouseMove={(e) => tooltip.visible && updatePosition(e.pageX, e.pageY)}
      onMouseLeave={() =>
        setTooltip({
          visible: false,
          content: "",
          x: 0,
          y: 0,
        })
      }
    >
      <button
        type="button"
        aria-label="info"
        className="w-4 h-4 flex items-center justify-center font-bold text-white bg-gray-500 rounded-full hover:bg-gray-600 focus:outline-none"
      >
        ?
      </button>

      {tooltip.visible && (
        <div
          className="absolute bg-gray-700 text-white text-sm rounded-md p-2 z-10"
          style={{
            position: "fixed",
            top: tooltip.y,
            left: tooltip.x,
            width: 200,
            whiteSpace: "pre-line",
            pointerEvents: "none",
            backgroundColor: "rgba(0,0,0,0.8)",
            borderRadius: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
          // 안전한 입력만 들어온다는 전제(고정 문구)로 사용
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}

function Dot({ style }: DotProps) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 15,
        height: 15,
        borderRadius: "50%",
        ...style,
      }}
    />
  );
}

/* =========================
   Main Component
   ========================= */

export default function ADMET({ cid, smiles, data }: ADMETProps) {
  return (
    <div className="admet-container p-8">
      {/* Selected Data Display */}
      <div className="mb-4">
        <p className="text-lg mb-2">The data you have selected is shown below:</p>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-left bg-gray-100">Field</th>
              <th className="border border-gray-300 p-2 text-left bg-gray-100">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-medium">Key / CID</td>
              <td className="border border-gray-300 p-2">{cid ?? "—"}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-medium">SMILES</td>
              <td className="border border-gray-300 p-2">{smiles ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section Container */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {/* Physicochemical Section */}
        <div className="mb-6">
          <div className="bg-blue-500 text-white text-xl font-semibold px-4 py-2">Physicochemical</div>
          <div className="bg-white">
            <table className="table-auto w-full border-collapse">
              <tbody>
                {data && (
                  <>
                    <tr>
                      <td className="border px-4 py-2 font-medium">Molecular Weight</td>
                      <td className="border px-4 py-2">{fmt2(data.molecular_weight)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.molecular_weight) &&
                              data.molecular_weight >= 100 &&
                              data.molecular_weight <= 600
                                ? "green"
                                : isNum(data.molecular_weight)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["The average molecular weight of the molecule", "divider", "optimal 100 ~ 600"]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">logP</td>
                      <td className="border px-4 py-2">{fmt2(data.logP)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Log of the octanol/water partition coefficient",
                            "divider",
                            "logP < 0: hydrophilic",
                            "logP > 0: lipophilic",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">nHa</td>
                      <td className="border px-4 py-2">{isNum(data.hydrogen_bond_acceptors) ? data.hydrogen_bond_acceptors : "—"}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.hydrogen_bond_acceptors) &&
                              data.hydrogen_bond_acceptors >= 0 &&
                              data.hydrogen_bond_acceptors <= 12
                                ? "green"
                                : isNum(data.hydrogen_bond_acceptors)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Number of hydrogen bond acceptors", "divider", "optimal: 0 ~ 12"]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">nHd</td>
                      <td className="border px-4 py-2">{isNum(data.hydrogen_bond_donors) ? data.hydrogen_bond_donors : "—"}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.hydrogen_bond_donors) &&
                              data.hydrogen_bond_donors >= 0 &&
                              data.hydrogen_bond_donors <= 7
                                ? "green"
                                : isNum(data.hydrogen_bond_donors)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Number of hydrogen bond donors", "divider", "optimal 0 ~ 7"]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Lipinski Rules</td>
                      <td className="border px-4 py-2">{isNum(data.Lipinski) ? data.Lipinski : "—"}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.Lipinski) && (data.Lipinski === 3 || data.Lipinski === 4)
                                ? "green"
                                : isNum(data.Lipinski)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "MW ≤ 500",
                            "logP ≤ 5",
                            "Hydrogen bond donors ≤ 5",
                            "Hydrogen bond acceptor ≤ 10",
                            "divider",
                            "If two properties are out of range, apoor absortion or permeability is possible, one is acceptable.",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">QED</td>
                      <td className="border px-4 py-2">{fmt2(data.QED)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor: isNum(data.QED)
                              ? triColor(data.QED, 0.49, 0.67, "asc")
                              : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Calculate the weighted sum of ADS mapped properties",
                            "A measure of drug-likeness based on the concept of desirability",
                            "divider",
                            "Attractive: > 0.67",
                            "unattractive: 0.49~0.67",
                            "too complex: < 0.34",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Stereo Centers</td>
                      <td className="border px-4 py-2">{isNum(data.stereo_centers) ? data.stereo_centers : "—"}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.stereo_centers) && data.stereo_centers <= 2
                                ? "green"
                                : isNum(data.stereo_centers)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "A point within a molecule ... influences PK and biological interactions.",
                            "divider",
                            "optimal: ≤ 2",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">TPSA</td>
                      <td className="border px-4 py-2">{fmt2(data.tpsa)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.tpsa) && data.tpsa >= 0 && data.tpsa <= 140
                                ? "green"
                                : isNum(data.tpsa)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Topological Polar Surface Area", "divider", "optimal: 0 ~ 140"]} />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution Section */}
        <div className="mb-6">
          <div className="bg-orange-500 text-white text-xl font-semibold px-4 py-2">Distribution</div>
          <div className="bg-white">
            <table className="table-auto w-full border-collapse">
              <tbody>
                {data && (
                  <>
                    <tr>
                      <td className="border px-4 py-2 font-medium">BBB</td>
                      <td className="border px-4 py-2">{fmt2(data.BBB_Martins)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4 flex items-center justify-center mx-auto">
                          {isNum(data.BBB_Martins)
                            ? data.BBB_Martins < 0.25
                              ? "--"
                              : data.BBB_Martins < 0.5
                              ? "-"
                              : data.BBB_Martins < 0.75
                              ? "+"
                              : data.BBB_Martins < 1
                              ? "++"
                              : ""
                            : ""}
                        </div>
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Blood-Brain Barrier Penetration", "divider", "Category 1: BBB++;", "Category 0: BBB--"]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">PPBR</td>
                      <td className="border px-4 py-2">{fmt2(data.PPBR_AZ)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.PPBR_AZ) && data.PPBR_AZ < 90
                                ? "green"
                                : isNum(data.PPBR_AZ)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Plasma Protein Binding ...", "divider", "optimal: < 90%"]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">VDss</td>
                      <td className="border px-4 py-2">{fmt2(data.VDss_Lombardo)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.VDss_Lombardo) &&
                              data.VDss_Lombardo >= 0.04 &&
                              data.VDss_Lombardo <= 20
                                ? "green"
                                : isNum(data.VDss_Lombardo)
                                ? "red"
                                : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Volume Distribution", "divider", "optimal: 0.04~20L/kg"]} />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Excretion Section */}
        <div className="mb-6">
          <div className="bg-amber-500 text-white text-xl font-semibold px-4 py-2">Excretion</div>
          <div className="bg-white">
            <table className="table-auto w-full border-collapse">
              <tbody>
                {data && (
                  <>
                    <tr>
                      <td className="border px-4 py-2 font-medium">T1/2</td>
                      <td className="border px-4 py-2">{fmt2(data.Half_Life_Obach)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "The units of predicted T1/T2 is hours.",
                            "Ultra-short: < 1h",
                            "short: 1-4h",
                            "intermediate: 4-8h",
                            "long: > 8h",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Drug Clearance (Hepatocyte)</td>
                      <td className="border px-4 py-2">{fmt2(data.Clearance_Hepatocyte_AZ)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Rate at which a drug is metabolized and cleared by hepatocytes."]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Drug Clearance (Microsome)</td>
                      <td className="border px-4 py-2">{fmt2(data.Clearance_Microsome_AZ)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Rate of metabolism/clearance in liver microsomes (e.g., CYP450 activity)."]} />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Absorption Section */}
        <div className="mb-6">
          <div className="bg-teal-500 text-white text-xl font-semibold px-4 py-2">Absorption</div>
          <div className="bg-white">
            <table className="table-auto w-full border-collapse">
              <tbody>
                {data && (
                  <>
                    <tr>
                      <td className="border px-4 py-2 font-medium">HIA</td>
                      <td className="border px-4 py-2">{fmt2(data.HIA_Hou)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor: isNum(data.HIA_Hou)
                              ? triColor(data.HIA_Hou, 0.3, 0.7, "asc")
                              : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Human Intestinal Absorption",
                            "divider",
                            "High: ≥ 0.7",
                            "Moderate: 0.3~0.7",
                            "Low: < 0.3",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Oral Bioavailability</td>
                      <td className="border px-4 py-2">{fmt2(data.Bioavailability_Ma)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["Extent to which active ingredient becomes available at the site of action."]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Aqueous Solubility</td>
                      <td className="border px-4 py-2">{fmt2(data.Solubility_AqSolDB)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Ability to dissolve in water (log(mol/L)); higher -> absorption, lower -> membrane permeability.",
                            "divider",
                            "log(mol/L)",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Lipophilicity</td>
                      <td className="border px-4 py-2">{fmt2(data.Lipophilicity_AstraZeneca)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Ability to dissolve in lipid environments. High -> high turnover/poor solubility.",
                            "divider",
                            "log-ratio",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Hydration Free Energy</td>
                      <td className="border px-4 py-2">{fmt2(data.HydrationFreeEnergy_FreeSolv)}</td>
                      <td className="border px-1 py-1 text-center">
                        <div className="w-4 h-4" />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton tooltipLines={["ΔG from vacuum to water (solvation).", "divider", "kcal/mol"]} />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">Cell Effective Permeability</td>
                      <td className="border px-4 py-2">{fmt2(data.Caco2_Wang)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor:
                              isNum(data.HIA_Hou) && data.HIA_Hou >= -5.15 ? "green" : isNum(data.HIA_Hou) ? "red" : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Caco-2 permeability as an indirect measure of HIA.",
                            "divider",
                            "Optimal: > -5.15 (log 10^-6 cm/s)",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">PAMPA</td>
                      <td className="border px-4 py-2">{fmt2(data.PAMPA_NCATS)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor: isNum(data.PAMPA_NCATS)
                              ? triColor(data.PAMPA_NCATS, 0.3, 0.7, "asc")
                              : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Parallel Artificial Membrane Permeability Assay",
                            "divider",
                            "High: ≥ 0.7",
                            "Moderate: 0.3~0.7",
                            "Low: < 0.3",
                          ]}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border px-4 py-2 font-medium">P-glycoprotein Inhibition</td>
                      <td className="border px-4 py-2">{fmt2(data.Pgp_Broccatelli)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor: isNum(data.Pgp_Broccatelli)
                              ? // 얘는 높을수록 위험 (적->노->초)
                                triColor(data.Pgp_Broccatelli, 0.3, 0.7, "desc")
                              : "transparent",
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Affects bioavailability, metabolism, brain penetration; MDR 관련.",
                            "Category 1: Inhibitor; Category 0: Non-inhibitor",
                          ]}
                        />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metabolism Section */}
        <div className="mb-6">
          <div className="bg-purple-500 text-white text-xl font-semibold px-4 py-2">Metabolism</div>
          <div className="bg-white">
            <table className="table-auto w-full border-collapse">
              <tbody>
                {data && (
                  <>
                    {[
                      ["CYP1A2 Inhibition", data.CYP1A2_Veith],
                      ["CYP2C19 Inhibition", data.CYP2C19_Veith],
                      ["CYP2C9 Inhibition", data.CYP2C9_Veith],
                      ["CYP2D6 Inhibition", data.CYP2D6_Veith],
                      ["CYP3A4 Inhibition", data.CYP3A4_Veith],
                      ["CYP2C9 Substrate", data.CYP2C9_Substrate_CarbonMangels],
                      ["CYP2D6 Substrate", data.CYP2D6_Substrate_CarbonMangels],
                      ["CYP3A4 Substrate", data.CYP3A4_Substrate_CarbonMangels],
                    ].map(([label, value]) => (
                      <tr key={label as string}>
                        <td className="border px-4 py-2 font-medium">{label}</td>
                        <td className="border px-4 py-2">{fmt2(value as number | undefined)}</td>
                        <td className="border px-1 py-1 text-center">
                          <div className="w-4 h-4" />
                        </td>
                        <td className="border px-1 py-1 text-center">
                          <TooltipButton tooltipLines={["Category 1: Inhibitor/Active; Category 0: Non-inhibitor/Inactive"]} />
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Toxicity Section */}
        <div className="mb-6">
          <div className="bg-red-500 text-white text-xl font-semibold px-4 py-2">Toxicity</div>
          <div className="bg-white">
            <table className="table-auto w-full border-collapse">
              <tbody>
                {data && (
                  <>
                    {[
                      ["hERG Blocking", data.hERG],
                      ["Clinical Toxicity", data.ClinTox],
                      ["AMES", data.AMES],
                      ["DILI", data.DILI],
                      ["Carcinogenicity", data.Carcinogens_Lagunin],
                      ["Skin Reaction", data.Skin_Reaction],
                      ["NR-AR", data["NR-AR"]],
                      ["NR-AR-LBD", data["NR-AR-LBD"]],
                      ["NR-AhR", data["NR-AhR"]],
                      ["NR-Aromatase", data["NR-Aromatase"]],
                      ["NR-ER", data["NR-ER"]],
                      ["NR-ER-LBD", data["NR-ER-LBD"]],
                      ["NR-PPAR-gamma", data["NR-PPAR-gamma"]],
                      ["SR-ARE", data["SR-ARE"]],
                      ["SR-ATAD5", data["SR-ATAD5"]],
                      ["SR-HSE", data["SR-HSE"]],
                      ["SR-MMP", data["SR-MMP"]],
                      ["SR-p53", data["SR-p53"]],
                    ].map(([label, value]) => (
                      <tr key={label as string}>
                        <td className="border px-4 py-2 font-medium">{label}</td>
                        <td className="border px-4 py-2">{fmt2(value as number | undefined)}</td>
                        <td className="border px-1 py-1 text-center">
                          <Dot
                            style={{
                              backgroundColor: isNum(value as number)
                                ? triColor(value as number, 0.3, 0.7, "desc") // 높으면 위험
                                : "transparent",
                            }}
                          />
                        </td>
                        <td className="border px-1 py-1 text-center">
                          <TooltipButton tooltipLines={["Category 1: Toxic/Active; Category 0: Non-toxic/Inactive"]} />
                        </td>
                      </tr>
                    ))}

                    {/* Acute Toxicity LD50 (별도 계산식 존재) */}
                    <tr>
                      <td className="border px-4 py-2 font-medium">Acute Toxicity LD50</td>
                      <td className="border px-4 py-2">{fmt2(data.LD50_Zhu)}</td>
                      <td className="border px-1 py-1 text-center">
                        <Dot
                          style={{
                            backgroundColor: (() => {
                              if (!isNum(data.LD50_Zhu) || !isNum(data.molecular_weight)) return "transparent";
                              const value = Math.pow(10, -data.LD50_Zhu) * data.molecular_weight * 1000;
                              if (value <= 50) return "red";
                              if (value <= 500) return "red";
                              if (value <= 5000) return "yellow";
                              return "green";
                            })(),
                          }}
                        />
                      </td>
                      <td className="border px-1 py-1 text-center">
                        <TooltipButton
                          tooltipLines={[
                            "Dose causing death in 50% (log(1/(mol/kg)))",
                            "divider",
                            "Note: GHS-aligned; extended for GIH criteria.",
                          ]}
                        />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
