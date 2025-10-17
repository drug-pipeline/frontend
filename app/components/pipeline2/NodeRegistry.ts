"use client";

import type { ComponentType } from "react";
import {
  FiPackage,
  FiEye,
  FiMap,
  FiInfo,
  FiActivity,
  FiLayers,
} from "react-icons/fi";

export type NodeType =
  | "PDB"
  | "COMPOUND"
  | "VISUALIZER"
  | "SECONDARY"
  | "DISTANCE_MAP"
  | "ADMET"
  | "UNIPROT_INFO"
  | "PDB_INFO"
  | "DEEPKINOME";

/** 레지스트리 항목 스키마 */
export type RegistryItem = {
  type: NodeType;

  /** UI */
  title: string;
  category: "Input" | "Visualizer" | "Analysis";
  Icon: ComponentType;

  /** React Flow */

  /** Connection Rules */
  acceptsFrom?: NodeType[];
  canConnectTo?: NodeType[];
};

const REGISTRY: Readonly<Record<NodeType, RegistryItem>> = {
  PDB: {
    type: "PDB",
    title: "PDB Input",
    category: "Input",
    Icon: FiPackage,
    canConnectTo: [
      "VISUALIZER",
      "SECONDARY",
      "DISTANCE_MAP",
      "PDB_INFO",
      "UNIPROT_INFO",
    ],
  },
  COMPOUND: {
    type: "COMPOUND",
    title: "Compound Input",
    category: "Input",
    Icon: FiPackage,
    canConnectTo: ["ADMET"],
  },
  VISUALIZER: {
    type: "VISUALIZER",
    title: "3D Visualizer",
    category: "Visualizer",
    Icon: FiEye,
    acceptsFrom: ["PDB"],
  },
  SECONDARY: {
    type: "SECONDARY",
    title: "Secondary Structure",
    category: "Visualizer",
    Icon: FiLayers,
    acceptsFrom: ["PDB"],
  },
  DISTANCE_MAP: {
    type: "DISTANCE_MAP",
    title: "Distance Map",
    category: "Visualizer",
    Icon: FiMap,
    acceptsFrom: ["PDB"],
  },
  ADMET: {
    type: "ADMET",
    title: "ADMET",
    category: "Analysis",
    Icon: FiActivity,
    acceptsFrom: ["COMPOUND"],
  },
  UNIPROT_INFO: {
    type: "UNIPROT_INFO",
    title: "UniProt Info",
    category: "Analysis",
    Icon: FiInfo,
    acceptsFrom: ["PDB"],
  },
  PDB_INFO: {
    type: "PDB_INFO",
    title: "PDB Info",
    category: "Analysis",
    Icon: FiInfo,
    acceptsFrom: ["PDB"],
  },
  DEEPKINOME: {
    type: "DEEPKINOME",
    title: "DeepKinome",
    category: "Analysis",
    Icon: FiActivity,
    acceptsFrom: ["PDB"],
  },
} as const;

/** === 편의 헬퍼들 === */
export function getSpec(type: NodeType): RegistryItem {
  return REGISTRY[type];
}

/** A → B 연결 가능 여부 */
export function canConnect(a: NodeType, b: NodeType): boolean {
  const A = REGISTRY[a];
  const B = REGISTRY[b];
  return !!(
    A?.canConnectTo?.includes(b) ||
    B?.acceptsFrom?.includes(a)
  );
}

/** 특정 타입이 받을 수 있는 입력(acceptsFrom) */
export function incomingOf(type: NodeType): readonly NodeType[] {
  return REGISTRY[type].acceptsFrom ?? [];
}

/** 특정 타입이 출력으로 연결 가능한 대상(canConnectTo) */
export function outgoingOf(type: NodeType): readonly NodeType[] {
  return REGISTRY[type].canConnectTo ?? [];
}

/** 카테고리별 묶기 */
export function listByCategory(): Record<RegistryItem["category"], RegistryItem[]> {
  return Object.values(REGISTRY).reduce((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {} as Record<RegistryItem["category"], RegistryItem[]>);
}