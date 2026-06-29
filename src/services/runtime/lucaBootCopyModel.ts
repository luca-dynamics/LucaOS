import type { BootSequence } from "../../hooks/app/useAppSystem";

export type LucaBootAudience = "standard" | "tactical";
export type LucaBootDiagnosticLabel =
  | "biosIdentity"
  | "initializingHardware"
  | "checkingMemoryBanks"
  | "mountingLocalCore"
  | "systemInitialization"
  | "cortexCore"
  | "visualCortex"
  | "audioReceptors"
  | "securityProtocols"
  | "loadingLucaOs"
  | "kernelAwakening"
  | "stabilizingLucaTensors"
  | "generatingIdentityKeypair"
  | "lucaAgentInitialized";

export interface LucaBootCopyEntry {
  standardLabel: string;
  tacticalLabel: string;
  audience: LucaBootAudience[];
  diagnosticMeaning: string;
}

export interface LucaBootSequenceCopy extends LucaBootCopyEntry {
  bootSequence: BootSequence;
}

export type LucaBootStatusValue = "OK" | "FAIL" | "PENDING";

export const LUCA_BOOT_COPY_BY_SEQUENCE: Record<BootSequence, LucaBootSequenceCopy> = {
  INIT: {
    bootSequence: "INIT",
    standardLabel: "Starting Luca",
    tacticalLabel: "INITIALIZING HARDWARE",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "App shell boot state before BIOS readiness checks begin.",
  },
  BIOS: {
    bootSequence: "BIOS",
    standardLabel: "Checking local brain",
    tacticalLabel: "LUCA BIOS v2.4",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Local server, Cortex, vision, audio, and model readiness checks are running.",
  },
  KERNEL: {
    bootSequence: "KERNEL",
    standardLabel: "Preparing Luca workspace",
    tacticalLabel: "LOADING LUCA OS",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Runtime services are being restored and the app is preparing the post-boot workspace.",
  },
  ONBOARDING: {
    bootSequence: "ONBOARDING",
    standardLabel: "Personalizing Luca",
    tacticalLabel: "KERNEL AWAKENING IN PROGRESS",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "First-run onboarding is active and will route through the existing onboarding steps.",
  },
  READY: {
    bootSequence: "READY",
    standardLabel: "Ready",
    tacticalLabel: "APP READY",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Main LucaOS runtime has taken over from the boot surface.",
  },
};

export const LUCA_BOOT_DIAGNOSTIC_COPY: Record<LucaBootDiagnosticLabel, LucaBootCopyEntry> = {
  biosIdentity: {
    standardLabel: "Starting Luca",
    tacticalLabel: "LUCA BIOS v2.4",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Boot identity label for the BIOS-style diagnostic shell.",
  },
  initializingHardware: {
    standardLabel: "Starting Luca",
    tacticalLabel: "INITIALIZING HARDWARE",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Initial app shell and runtime boot preparation.",
  },
  checkingMemoryBanks: {
    standardLabel: "Preparing memory",
    tacticalLabel: "CHECKING MEMORY BANKS",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Memory and persisted local context are being prepared for startup.",
  },
  mountingLocalCore: {
    standardLabel: "Checking local brain",
    tacticalLabel: "MOUNTING LOCAL_CORE",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Local Cortex/core availability is being checked.",
  },
  systemInitialization: {
    standardLabel: "Startup",
    tacticalLabel: "SYSTEM INITIALIZATION",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Primary LucaOS backend readiness gate.",
  },
  cortexCore: {
    standardLabel: "Local brain",
    tacticalLabel: "CORTEX CORE (RAG)",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Cortex/local retrieval and memory core availability.",
  },
  visualCortex: {
    standardLabel: "Vision",
    tacticalLabel: "VISUAL CORTEX",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Camera and browser media-device vision capability probe.",
  },
  audioReceptors: {
    standardLabel: "Voice",
    tacticalLabel: "AUDIO RECEPTORS",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Microphone/media-device voice capability probe.",
  },
  securityProtocols: {
    standardLabel: "Safety checks active",
    tacticalLabel: "SECURITY PROTOCOLS: ENGAGED",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Security guardrails are active during startup.",
  },
  loadingLucaOs: {
    standardLabel: "Preparing Luca workspace",
    tacticalLabel: "LOADING LUCA OS",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Kernel/runtime restoration before the main workspace appears.",
  },
  kernelAwakening: {
    standardLabel: "Luca is waking up",
    tacticalLabel: "KERNEL AWAKENING IN PROGRESS",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Onboarding kernel-awakening sequence has started.",
  },
  stabilizingLucaTensors: {
    standardLabel: "Preparing Luca’s personality and memory",
    tacticalLabel: "STABILIZING LUCA TENSORS",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Persona and memory context are being prepared for first run.",
  },
  generatingIdentityKeypair: {
    standardLabel: "Securing your Luca identity",
    tacticalLabel: "GENERATING IDENTITY KEYPAIR [ED25519]",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Onboarding identity/security preparation copy.",
  },
  lucaAgentInitialized: {
    standardLabel: "Luca is ready to meet you",
    tacticalLabel: "LUCA AGENT INITIALIZED",
    audience: ["standard", "tactical"],
    diagnosticMeaning: "Onboarding kernel-awakening sequence is complete.",
  },
};

export const getLucaBootSequenceCopy = (bootSequence: BootSequence): LucaBootSequenceCopy =>
  LUCA_BOOT_COPY_BY_SEQUENCE[bootSequence];

export const getLucaBootDiagnosticCopy = (
  label: LucaBootDiagnosticLabel,
): LucaBootCopyEntry => LUCA_BOOT_DIAGNOSTIC_COPY[label];

export const getLucaBootStatusCopy = (status: LucaBootStatusValue) => {
  if (status === "OK") {
    return "Ready";
  }

  if (status === "FAIL") {
    return "Needs attention";
  }

  return "Checking…";
};
