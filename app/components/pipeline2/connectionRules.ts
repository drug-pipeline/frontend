// connectionRules.ts
import type { Node } from "reactflow";
import type { NodeData, ModuleKey } from "@/app/components/pipeline2/NodeCard";

/**
 * Returns whether a connection is allowed between two nodes based on module keys.
 * - PDB → { visualizer, vis-secondary, distance-map, pdb-info, uniprot-info, deep-kinome }
 * - COMPOUND → { admet }
 */
export function allowConnection(
  sourceNode?: Node<NodeData>,
  targetNode?: Node<NodeData>
): boolean {
  const sKey = sourceNode?.data?.key as ModuleKey | undefined;
  const tKey = targetNode?.data?.key as ModuleKey | undefined;
  if (!sKey || !tKey) return false;

  // PDB → DeepKinome 허용
  if (sKey === "pdb-input" && tKey === "deep-kinome") return true;

  // PDB → 시각화/보조 정보
  if (
    sKey === "pdb-input" &&
    (tKey === "visualizer" ||
      tKey === "vis-secondary" ||
      tKey === "distance-map" ||
      tKey === "pdb-info" ||
      tKey === "uniprot-info")
  ) {
    return true;
  }

  // COMPOUND → ADMET
  if (sKey === "compound-input" && tKey === "admet") return true;

  return false;
}
