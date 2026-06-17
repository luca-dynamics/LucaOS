import type { BootSequence } from "../../hooks/app/useAppSystem";
import {
  getLucaBootDiagnosticCopy,
  getLucaBootStatusCopy,
  type LucaBootStatusValue,
} from "../../services/runtime/lucaBootCopyModel";

export type BiosStatus = Partial<
  Record<
    "server" | "core" | "vision" | "audio" | "ollama",
    LucaBootStatusValue | string
  >
>;

export type ReadinessTone = "ready" | "pending" | "attention";

export const LUCA_BOOT_IDENTITY_ASSET_SRC = new URL(
  "../../../landing/hologram.png",
  import.meta.url,
).href;

export interface LucaBootLaunchIdentityPresence {
  label: "LucaOS";
  subtitle: "Host-native AI operating system";
  assetSrc: typeof LUCA_BOOT_IDENTITY_ASSET_SRC;
  emphasis: "launch" | "supporting";
  markOpacity: number;
  visualOnly: true;
  source: "existing-landing-hologram-face-asset";
  introducesBootPhase: false;
  usesHeavyHologramRuntime: false;
}

export const getLucaBootLaunchIdentityPresence = (
  bootSequence: BootSequence,
): LucaBootLaunchIdentityPresence => {
  const isLaunchEmphasis = bootSequence === "INIT";

  return {
    label: "LucaOS",
    subtitle: "Host-native AI operating system",
    assetSrc: LUCA_BOOT_IDENTITY_ASSET_SRC,
    emphasis: isLaunchEmphasis ? "launch" : "supporting",
    markOpacity: isLaunchEmphasis ? 0.92 : 0.62,
    visualOnly: true,
    source: "existing-landing-hologram-face-asset",
    introducesBootPhase: false,
    usesHeavyHologramRuntime: false,
  };
};

export interface LucaBootReadinessItem {
  id:
    | "memory"
    | "workspace"
    | "localBrain"
    | "vision"
    | "voice"
    | "safety"
    | "tools"
    | "webSurface"
    | "desktopRuntime"
    | "lucaLink"
    | "personalIntelligence"
    | "localModels"
    | "actions";
  label: string;
  status: LucaBootStatusValue;
  statusLabel: string;
  detail: string;
  icon: string;
  source: "biosStatus" | "bootCopy" | "webPolicy";
  sourceKey:
    | keyof BiosStatus
    | "checkingMemoryBanks"
    | "securityProtocols"
    | "browserSafeCapabilities";
}

export const normalizeBootStatus = (status: unknown): LucaBootStatusValue => {
  if (status === "OK" || status === "FAIL") {
    return status;
  }

  return "PENDING";
};

export const resolveLucaBootReadinessTone = (
  status: LucaBootStatusValue,
): ReadinessTone => {
  if (status === "OK") {
    return "ready";
  }

  if (status === "FAIL") {
    return "attention";
  }

  return "pending";
};

export const lucaBootProgressBySequence: Record<
  Exclude<BootSequence, "READY" | "ONBOARDING">,
  number
> = {
  INIT: 32,
  BIOS: 66,
  KERNEL: 88,
};

const bootStatusForCompletedSequence = (
  bootSequence: BootSequence,
  completeAfterInit: LucaBootStatusValue = "OK",
): LucaBootStatusValue => {
  if (bootSequence === "INIT") {
    return completeAfterInit;
  }

  if (
    bootSequence === "BIOS" ||
    bootSequence === "KERNEL" ||
    bootSequence === "READY"
  ) {
    return "OK";
  }

  return "PENDING";
};

export const LUCA_BOOT_VISUAL_LANGUAGE = {
  shell: "premium-luca-hologram-presence",
  sharedAcrossDesktopAndWeb: true,
  primaryIdentity: "Existing landing hologram face presence",
  forbidsGenericWebOrbAsMainVisual: true,
  forbidsLogoIconAsMainVisual: true,
  usesHeavyHologramRuntime: false,
} as const;

export const LUCA_BROWSER_SAFE_BOOT_STATUS = {
  headline: "Entering browser host",
  detail: "Resolving host interface",
  progress: 100,
} as const;

export const buildBrowserSafeLucaBootReadinessItems = (): LucaBootReadinessItem[] => [
  {
    id: "webSurface",
    label: "Web surface",
    status: "OK",
    statusLabel: "Ready",
    detail: "Web surface ready",
    icon: "Monitor",
    source: "webPolicy",
    sourceKey: "browserSafeCapabilities",
  },
  {
    id: "memory",
    label: "Memory surface",
    status: "OK",
    statusLabel: "Prepared",
    detail: "Memory surface prepared",
    icon: "Database",
    source: "webPolicy",
    sourceKey: "browserSafeCapabilities",
  },
  {
    id: "tools",
    label: "Model router",
    status: "OK",
    statusLabel: "Guarded",
    detail: "Model router guarded",
    icon: "ShieldCheck",
    source: "webPolicy",
    sourceKey: "browserSafeCapabilities",
  },
  {
    id: "desktopRuntime",
    label: "Desktop runtime",
    status: "PENDING",
    statusLabel: "Desktop required",
    detail: "Desktop runtime requires LucaOS Desktop",
    icon: "Cpu",
    source: "webPolicy",
    sourceKey: "browserSafeCapabilities",
  },
  {
    id: "lucaLink",
    label: "LucaLink",
    status: "PENDING",
    statusLabel: "Pairing required",
    detail: "LucaLink requires pairing",
    icon: "Link",
    source: "webPolicy",
    sourceKey: "browserSafeCapabilities",
  },
  {
    id: "actions",
    label: "Actions",
    status: "OK",
    statusLabel: "Permissioned",
    detail: "Actions remain permissioned",
    icon: "ShieldCheck",
    source: "webPolicy",
    sourceKey: "browserSafeCapabilities",
  },
];

export const buildLucaBootReadinessItems = (
  bootSequence: BootSequence,
  biosStatus: BiosStatus,
): LucaBootReadinessItem[] => {
  const memoryCopy = getLucaBootDiagnosticCopy("checkingMemoryBanks");
  const workspaceCopy = getLucaBootDiagnosticCopy("systemInitialization");
  const brainCopy = getLucaBootDiagnosticCopy("cortexCore");
  const visionCopy = getLucaBootDiagnosticCopy("visualCortex");
  const voiceCopy = getLucaBootDiagnosticCopy("audioReceptors");
  const safetyCopy = getLucaBootDiagnosticCopy("securityProtocols");

  const items: LucaBootReadinessItem[] = [
    {
      id: "memory",
      label: "Memory",
      status: bootStatusForCompletedSequence(bootSequence),
      statusLabel: getLucaBootStatusCopy(
        bootStatusForCompletedSequence(bootSequence),
      ),
      detail: memoryCopy.standardLabel,
      icon: "Database",
      source: "bootCopy",
      sourceKey: "checkingMemoryBanks",
    },
    {
      id: "workspace",
      label: "Workspace",
      status: normalizeBootStatus(biosStatus.server),
      statusLabel: getLucaBootStatusCopy(
        normalizeBootStatus(biosStatus.server),
      ),
      detail: workspaceCopy.standardLabel,
      icon: "Monitor",
      source: "biosStatus",
      sourceKey: "server",
    },
    {
      id: "localBrain",
      label: brainCopy.standardLabel,
      status: normalizeBootStatus(biosStatus.core),
      statusLabel: getLucaBootStatusCopy(normalizeBootStatus(biosStatus.core)),
      detail: getLucaBootDiagnosticCopy("mountingLocalCore").standardLabel,
      icon: "Brain",
      source: "biosStatus",
      sourceKey: "core",
    },
    {
      id: "vision",
      label: visionCopy.standardLabel,
      status: normalizeBootStatus(biosStatus.vision),
      statusLabel: getLucaBootStatusCopy(
        normalizeBootStatus(biosStatus.vision),
      ),
      detail: "Activating vision",
      icon: "Eye",
      source: "biosStatus",
      sourceKey: "vision",
    },
    {
      id: "voice",
      label: voiceCopy.standardLabel,
      status: normalizeBootStatus(biosStatus.audio),
      statusLabel: getLucaBootStatusCopy(normalizeBootStatus(biosStatus.audio)),
      detail: "Loading voice",
      icon: "Mic",
      source: "biosStatus",
      sourceKey: "audio",
    },
    {
      id: "safety",
      label: "Safety",
      status: bootStatusForCompletedSequence(bootSequence, "PENDING"),
      statusLabel: getLucaBootStatusCopy(
        bootStatusForCompletedSequence(bootSequence, "PENDING"),
      ),
      detail: safetyCopy.standardLabel,
      icon: "ShieldCheck",
      source: "bootCopy",
      sourceKey: "securityProtocols",
    },
  ];

  if ("ollama" in biosStatus) {
    const toolsStatus = normalizeBootStatus(biosStatus.ollama);
    items.push({
      id: "tools",
      label: "Model bridge",
      status: toolsStatus,
      statusLabel: getLucaBootStatusCopy(toolsStatus),
      detail: "Local model bridge",
      icon: "Wrench",
      source: "biosStatus",
      sourceKey: "ollama",
    });
  }

  return items;
};
