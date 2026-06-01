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

export interface LucaBootReadinessItem {
  id:
    | "memory"
    | "workspace"
    | "localBrain"
    | "vision"
    | "voice"
    | "safety"
    | "tools";
  label: string;
  status: LucaBootStatusValue;
  statusLabel: string;
  detail: string;
  icon: string;
  source: "biosStatus" | "bootCopy";
  sourceKey: keyof BiosStatus | "checkingMemoryBanks" | "securityProtocols";
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
      label: "Tools",
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
