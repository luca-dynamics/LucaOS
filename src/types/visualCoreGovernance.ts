// VisualCore governance audit types — PR #140: VisualCore Architecture Audit.
//
// This is an AUDIT/MAP layer only. It describes what VisualCore (the large
// visual operating surface / HUD router in src/components/VisualCore.tsx)
// currently contains so governance can later be introduced safely.
//
// Hard guarantees — these types and the helpers built on them NEVER:
//   - refactor VisualCore or change how its modes open/switch/execute
//   - wrap, govern, or gate any VisualCore mode at runtime
//   - touch Electron IPC, remote-control handling, or browser-mode behavior
//   - enable capture / screenshot / OCR / vision / file / network / messaging
//     / wireless / tool execution
//
// It only classifies each existing surface mode by capability + risk and
// records a conservative governance readiness recommendation.

/**
 * Every visual surface mode currently routed by VisualCore.tsx.
 * Mirrors `VisualCoreMode` in src/components/VisualCore.tsx exactly.
 */
export type VisualCoreSurfaceMode =
  | "IDLE"
  | "BROWSER"
  | "DATA"
  | "CINEMA"
  | "DATA_ROOM"
  | "SECURITY"
  | "SOVEREIGNTY"
  | "OSINT"
  | "STOCKS"
  | "AUTONOMY"
  | "SUBSYSTEMS"
  | "CODE_EDITOR"
  | "SKILLS"
  | "CRYPTO"
  | "FOREX"
  | "PREDICTIONS"
  | "NETWORK"
  | "HACKING"
  | "REPORTS"
  | "GEO"
  | "LIVE"
  | "FILES"
  | "VISION"
  | "RECORDER"
  | "TELEGRAM"
  | "WHATSAPP"
  | "WIRELESS"
  | "INGESTION"
  | "TACTICAL";

/** Capability-oriented grouping of a surface mode. */
export type VisualCoreSurfaceCategory =
  | "passive_display"
  | "browser_surface"
  | "media_surface"
  | "data_surface"
  | "finance_surface"
  | "code_surface"
  | "file_surface"
  | "vision_surface"
  | "recorder_surface"
  | "messaging_surface"
  | "wireless_surface"
  | "security_surface"
  | "device_cast_surface"
  | "ingestion_surface"
  | "tactical_surface"
  | "unknown_surface";

/** Conservative risk classification for a surface mode. */
export type VisualCoreSurfaceRiskLevel = "low" | "elevated" | "high" | "critical";

/**
 * Recommended governance readiness — what a *future* PR would need before this
 * mode could be governed. This layer never performs any of these steps.
 */
export type VisualCoreGovernanceReadiness =
  | "ready_for_display_governance"
  | "needs_sensitive_mode_gate"
  | "needs_runtime_adapter"
  | "needs_manual_review"
  | "blocked_until_dedicated_policy";

/**
 * Audit-only capability flags. A `true` value describes a capability the mode
 * *exposes today in VisualCore*, NOT a capability this layer enables. Nothing
 * here turns any capability on.
 */
export interface VisualCoreSurfaceCapabilityFlags {
  displaysData: boolean;
  opensBrowser: boolean;
  playsMedia: boolean;
  castsToDevice: boolean;
  handlesFiles: boolean;
  handlesCode: boolean;
  handlesFinance: boolean;
  handlesMessaging: boolean;
  handlesWireless: boolean;
  handlesVision: boolean;
  recordsMedia: boolean;
  handlesIngestion: boolean;
  securityOrHackingSurface: boolean;
  remoteControlCapable: boolean;
  ipcDriven: boolean;
  requiresUserApproval: boolean;
  requiresAuditLog: boolean;
  requiresSensitiveModeGate: boolean;
  canExecuteExternalAction: boolean;
  canReadUserData: boolean;
  captureEnabled: boolean;
  automationEnabled: boolean;
  walletPaymentEnabled: boolean;
  credentialSensitive: boolean;
}

/**
 * The full audit classification of a single VisualCore surface mode.
 * This is a description of existing architecture, not a runtime contract.
 */
export interface VisualCoreSurfacePolicy {
  mode: VisualCoreSurfaceMode;
  category: VisualCoreSurfaceCategory;
  riskLevel: VisualCoreSurfaceRiskLevel;
  readiness: VisualCoreGovernanceReadiness;
  /** True when this mode is operationally sensitive (high/critical or gated). */
  sensitive: boolean;
  /** User-facing label for the surface. */
  label: string;
  /** Short audit-only description of what the mode displays/does today. */
  summary: string;
  capabilities: VisualCoreSurfaceCapabilityFlags;
  /** Optional audit notes (e.g. uses embedded LucaBrowser, legacy Ghost label). */
  notes?: string[];
}

/** Aggregate counts produced by auditing the full mode map. */
export interface VisualCoreArchitectureAuditSummary {
  totalModes: number;
  byCategory: Record<VisualCoreSurfaceCategory, number>;
  byRiskLevel: Record<VisualCoreSurfaceRiskLevel, number>;
  byReadiness: Record<VisualCoreGovernanceReadiness, number>;
  sensitiveModes: VisualCoreSurfaceMode[];
  sensitiveModeCount: number;
  criticalModes: VisualCoreSurfaceMode[];
  criticalModeCount: number;
  readyForDisplayGovernanceModes: VisualCoreSurfaceMode[];
  readyForDisplayGovernanceCount: number;
  /** True while no VisualCore mode is actually governed/wrapped yet. */
  governanceApplied: false;
}

/** Every VisualCore surface mode, in the order declared by VisualCore.tsx. */
export const VISUAL_CORE_SURFACE_MODES: VisualCoreSurfaceMode[] = [
  "IDLE",
  "BROWSER",
  "DATA",
  "CINEMA",
  "DATA_ROOM",
  "SECURITY",
  "SOVEREIGNTY",
  "OSINT",
  "STOCKS",
  "AUTONOMY",
  "SUBSYSTEMS",
  "CODE_EDITOR",
  "SKILLS",
  "CRYPTO",
  "FOREX",
  "PREDICTIONS",
  "NETWORK",
  "HACKING",
  "REPORTS",
  "GEO",
  "LIVE",
  "FILES",
  "VISION",
  "RECORDER",
  "TELEGRAM",
  "WHATSAPP",
  "WIRELESS",
  "INGESTION",
  "TACTICAL",
];

/** All surface categories. */
export const VISUAL_CORE_SURFACE_CATEGORIES: VisualCoreSurfaceCategory[] = [
  "passive_display",
  "browser_surface",
  "media_surface",
  "data_surface",
  "finance_surface",
  "code_surface",
  "file_surface",
  "vision_surface",
  "recorder_surface",
  "messaging_surface",
  "wireless_surface",
  "security_surface",
  "device_cast_surface",
  "ingestion_surface",
  "tactical_surface",
  "unknown_surface",
];

/** All risk levels, lowest → highest. */
export const VISUAL_CORE_SURFACE_RISK_LEVELS: VisualCoreSurfaceRiskLevel[] = [
  "low",
  "elevated",
  "high",
  "critical",
];

/** All governance readiness states. */
export const VISUAL_CORE_GOVERNANCE_READINESS_STATES: VisualCoreGovernanceReadiness[] =
  [
    "ready_for_display_governance",
    "needs_sensitive_mode_gate",
    "needs_runtime_adapter",
    "needs_manual_review",
    "blocked_until_dedicated_policy",
  ];
