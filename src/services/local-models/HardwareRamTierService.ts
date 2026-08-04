/**
 * HardwareRamTierService — detects user device system RAM tier
 * and classifies local models into hardware-optimal buckets by bridging
 * LocalModelCatalog's VRAM Guard metrics and native desktop RAM metrics.
 */

import { LOCAL_MODEL_CATALOG, findLocalModelDescriptor } from "./LocalModelCatalog";

export type RamTierKind = "entry" | "balanced" | "pro" | "workstation";

export interface HardwareRamSummary {
  totalRamGb: number;
  tier: RamTierKind;
  recommendedMaxModelParamBytes: number;
  displayLabel: string;
  iconName?: string;
}

export interface ModelHardwarePolicyResult {
  compatible: boolean;
  recommendation: "RECOMMENDED" | "OPTIMAL" | "RESTRICTED" | "WARNING" | "UNSUPPORTED";
  statusLabel: string;
  badgeColor: string;
}

/**
 * Detect total system RAM in GB using Electron desktop bridge or browser API.
 */
export function detectSystemRamGb(): number {
  if (typeof window !== "undefined") {
    const nativeRam = (window as any).luca?.systemRamGb;
    if (typeof nativeRam === "number" && nativeRam > 0) {
      return nativeRam;
    }
    const devMem = (navigator as any).deviceMemory;
    if (typeof devMem === "number" && devMem > 0) {
      return devMem;
    }
  }
  return 16; // Safe default fallback
}

/**
 * Classify system into RAM hardware tier.
 */
export function getHardwareRamSummary(): HardwareRamSummary {
  const ram = detectSystemRamGb();

  if (ram >= 64) {
    return {
      totalRamGb: ram,
      tier: "workstation",
      recommendedMaxModelParamBytes: 90_000_000_000,
      displayLabel: `${ram}GB RAM (Workstation)`,
      iconName: "Zap",
    };
  }
  if (ram >= 32) {
    return {
      totalRamGb: ram,
      tier: "pro",
      recommendedMaxModelParamBytes: 32_000_000_000,
      displayLabel: `${ram}GB RAM (Pro)`,
      iconName: "Cpu",
    };
  }
  if (ram >= 16) {
    return {
      totalRamGb: ram,
      tier: "balanced",
      recommendedMaxModelParamBytes: 16_000_000_000,
      displayLabel: `${ram}GB RAM (Balanced)`,
      iconName: "Cpu",
    };
  }
  return {
    totalRamGb: ram,
    tier: "entry",
    recommendedMaxModelParamBytes: 8_000_000_000,
    displayLabel: `${ram}GB RAM (Standard)`,
    iconName: "Cpu",
  };
}

/**
 * Unified model hardware compatibility check using LocalModelCatalog minRamBytes.
 */
export function getUnifiedModelHardwarePolicy(modelTagOrId: string): ModelHardwarePolicyResult {
  const ram = detectSystemRamGb();
  const matched =
    findLocalModelDescriptor(modelTagOrId) ||
    LOCAL_MODEL_CATALOG.find(
      (m) =>
        m.id === modelTagOrId ||
        m.runtimeModelId === modelTagOrId ||
        m.displayName.toLowerCase().includes(modelTagOrId.toLowerCase()),
    );

  if (matched?.minRamBytes) {
    const requiredGb = Math.ceil(matched.minRamBytes / 1_000_000_000);
    if (ram < requiredGb * 0.75) {
      return {
        compatible: false,
        recommendation: "UNSUPPORTED",
        statusLabel: `Requires ${requiredGb}GB RAM`,
        badgeColor: "#ef4444",
      };
    }
    if (ram < requiredGb) {
      return {
        compatible: true,
        recommendation: "WARNING",
        statusLabel: `High VRAM (${requiredGb}GB)`,
        badgeColor: "#f59e0b",
      };
    }
    return {
      compatible: true,
      recommendation: "OPTIMAL",
      statusLabel: "Optimal",
      badgeColor: "#10b981",
    };
  }

  // Fallback for tags with size suffixes (e.g. 90b, 30b)
  const isHeavy90B = modelTagOrId.includes("90b") || modelTagOrId.includes("235b");
  const isMedium30B = modelTagOrId.includes("30b") || modelTagOrId.includes("31b") || modelTagOrId.includes("27b");

  if (isHeavy90B) {
    return {
      compatible: ram >= 64,
      recommendation: ram >= 64 ? "OPTIMAL" : "WARNING",
      statusLabel: "64GB Workstation",
      badgeColor: ram >= 64 ? "#10b981" : "#f59e0b",
    };
  }

  if (isMedium30B) {
    return {
      compatible: ram >= 32,
      recommendation: ram >= 32 ? "OPTIMAL" : "RESTRICTED",
      statusLabel: "32GB Pro",
      badgeColor: ram >= 32 ? "#10b981" : "#3b82f6",
    };
  }

  return {
    compatible: true,
    recommendation: "OPTIMAL",
    statusLabel: "Optimal",
    badgeColor: "#10b981",
  };
}
