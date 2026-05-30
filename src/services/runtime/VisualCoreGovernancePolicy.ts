// VisualCoreGovernancePolicy — PR #140: VisualCore Architecture Audit.
//
// AUDIT/MAP layer only. This module classifies every visual surface mode
// currently routed by src/components/VisualCore.tsx by capability + risk and
// records a conservative governance-readiness recommendation.
//
// Hard guarantees:
//   - This file NEVER governs, wraps, gates, or executes any VisualCore mode.
//   - It NEVER changes mode switching, IPC, or browser-mode behavior.
//   - Every capability flag describes a capability the mode *exposes today*,
//     not a capability this layer enables. Nothing here turns anything on.
//   - Risk classification is intentionally conservative. A mode being listed
//     as "ready_for_display_governance" is a recommendation for a FUTURE PR,
//     not a claim that the mode is safe to wrap now.

import {
  VISUAL_CORE_GOVERNANCE_READINESS_STATES,
  VISUAL_CORE_SURFACE_CATEGORIES,
  VISUAL_CORE_SURFACE_MODES,
  VISUAL_CORE_SURFACE_RISK_LEVELS,
  type VisualCoreArchitectureAuditSummary,
  type VisualCoreGovernanceReadiness,
  type VisualCoreSurfaceCapabilityFlags,
  type VisualCoreSurfaceCategory,
  type VisualCoreSurfaceMode,
  type VisualCoreSurfacePolicy,
  type VisualCoreSurfaceRiskLevel,
} from "../../types/visualCoreGovernance";

/** Default capability flags — everything off. Modes override only what applies. */
function caps(
  overrides: Partial<VisualCoreSurfaceCapabilityFlags>,
): VisualCoreSurfaceCapabilityFlags {
  return {
    displaysData: false,
    opensBrowser: false,
    playsMedia: false,
    castsToDevice: false,
    handlesFiles: false,
    handlesCode: false,
    handlesFinance: false,
    handlesMessaging: false,
    handlesWireless: false,
    handlesVision: false,
    recordsMedia: false,
    handlesIngestion: false,
    securityOrHackingSurface: false,
    remoteControlCapable: false,
    // VisualCore itself is IPC-driven; every mode renders inside that surface.
    ipcDriven: true,
    requiresUserApproval: false,
    requiresAuditLog: false,
    requiresSensitiveModeGate: false,
    canExecuteExternalAction: false,
    canReadUserData: false,
    captureEnabled: false,
    automationEnabled: false,
    walletPaymentEnabled: false,
    credentialSensitive: false,
    ...overrides,
  };
}

/**
 * A mode is "sensitive" when it is high/critical risk, or when it needs a
 * sensitive-mode gate / dedicated policy before any governance.
 */
function isSensitive(
  riskLevel: VisualCoreSurfaceRiskLevel,
  readiness: VisualCoreGovernanceReadiness,
): boolean {
  if (riskLevel === "high" || riskLevel === "critical") return true;
  return (
    readiness === "needs_sensitive_mode_gate" ||
    readiness === "blocked_until_dedicated_policy"
  );
}

interface PolicySeed {
  mode: VisualCoreSurfaceMode;
  category: VisualCoreSurfaceCategory;
  riskLevel: VisualCoreSurfaceRiskLevel;
  readiness: VisualCoreGovernanceReadiness;
  label: string;
  summary: string;
  capabilities: VisualCoreSurfaceCapabilityFlags;
  notes?: string[];
}

function policy(seed: PolicySeed): VisualCoreSurfacePolicy {
  return {
    ...seed,
    sensitive: isSensitive(seed.riskLevel, seed.readiness),
  };
}

const POLICY_SEEDS: PolicySeed[] = [
  policy({
    mode: "IDLE",
    category: "passive_display",
    riskLevel: "low",
    readiness: "ready_for_display_governance",
    label: "Idle HUD",
    summary: "Passive standby surface with auto-hide after idle timeout.",
    capabilities: caps({}),
  }),
  policy({
    mode: "BROWSER",
    category: "browser_surface",
    riskLevel: "high",
    readiness: "needs_runtime_adapter",
    label: "Browser",
    summary:
      "Routes a browser surface via embedded LucaBrowser; switched by props and by the BROWSER_NAVIGATE remote command.",
    capabilities: caps({
      displaysData: true,
      opensBrowser: true,
      remoteControlCapable: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
      canReadUserData: true,
    }),
    notes: [
      "Renders <LucaBrowser mode=\"EMBEDDED\" /> — embedded mode, NOT governed LucaBrowser mode.",
      "Remote command BROWSER_NAVIGATE switches to BROWSER mode and sets the URL.",
      "Header label still reads GHOST_BROWSER_OVERLAY / Ghost — legacy naming.",
      "Should later use governed LucaBrowser mode behind a runtime adapter.",
    ],
  }),
  policy({
    mode: "DATA",
    category: "data_surface",
    riskLevel: "low",
    readiness: "ready_for_display_governance",
    label: "Data",
    summary: "Read-only data presenter (VisualDataPresenter) for agent data.",
    capabilities: caps({ displaysData: true }),
  }),
  policy({
    mode: "CINEMA",
    category: "media_surface",
    riskLevel: "elevated",
    readiness: "needs_manual_review",
    label: "Cinema",
    summary: "Media/cinema player surface; can cast and mirror video streams.",
    capabilities: caps({
      displaysData: true,
      playsMedia: true,
      castsToDevice: true,
    }),
    notes: ["Mirror title still references \"Ghost Mirror\" — legacy naming."],
  }),
  policy({
    mode: "DATA_ROOM",
    category: "data_surface",
    riskLevel: "low",
    readiness: "ready_for_display_governance",
    label: "Data Room",
    summary: "Read-only data-room display variant of the data surface.",
    capabilities: caps({ displaysData: true }),
  }),
  policy({
    mode: "SECURITY",
    category: "security_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Security",
    summary: "Security-themed operational surface.",
    capabilities: caps({
      displaysData: true,
      securityOrHackingSurface: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "SOVEREIGNTY",
    category: "data_surface",
    riskLevel: "elevated",
    readiness: "ready_for_display_governance",
    label: "Sovereignty",
    summary: "Sovereignty dashboard; displays sovereign facts/state.",
    capabilities: caps({ displaysData: true, canReadUserData: true }),
  }),
  policy({
    mode: "OSINT",
    category: "security_surface",
    riskLevel: "elevated",
    readiness: "needs_manual_review",
    label: "OSINT",
    summary: "OSINT dossier surface; intelligence/profile display.",
    capabilities: caps({ displaysData: true, canReadUserData: true }),
  }),
  policy({
    mode: "STOCKS",
    category: "finance_surface",
    riskLevel: "elevated",
    readiness: "needs_sensitive_mode_gate",
    label: "Stocks",
    summary: "Stock terminal display. No trading execution.",
    capabilities: caps({
      displaysData: true,
      handlesFinance: true,
      requiresSensitiveModeGate: true,
    }),
  }),
  policy({
    mode: "AUTONOMY",
    category: "tactical_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Autonomy",
    summary: "Autonomy dashboard; agent/tool-oriented control surface.",
    capabilities: caps({
      displaysData: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "SUBSYSTEMS",
    category: "data_surface",
    riskLevel: "low",
    readiness: "ready_for_display_governance",
    label: "Subsystems",
    summary: "Subsystem status dashboard; read-only system display.",
    capabilities: caps({ displaysData: true }),
  }),
  policy({
    mode: "CODE_EDITOR",
    category: "code_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Code Editor",
    summary: "Code editor surface. No execution unless governed later.",
    capabilities: caps({
      displaysData: true,
      handlesCode: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "SKILLS",
    category: "tactical_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Skills",
    summary: "Skills matrix; agent skill/tool surface.",
    capabilities: caps({
      displaysData: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
    }),
  }),
  policy({
    mode: "CRYPTO",
    category: "finance_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Crypto",
    summary: "Crypto terminal display. No wallet/trading execution.",
    capabilities: caps({
      displaysData: true,
      handlesFinance: true,
      requiresSensitiveModeGate: true,
      credentialSensitive: true,
    }),
  }),
  policy({
    mode: "FOREX",
    category: "finance_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Forex",
    summary: "Forex terminal display. No trading execution.",
    capabilities: caps({
      displaysData: true,
      handlesFinance: true,
      requiresSensitiveModeGate: true,
    }),
  }),
  policy({
    mode: "PREDICTIONS",
    category: "finance_surface",
    riskLevel: "elevated",
    readiness: "needs_sensitive_mode_gate",
    label: "Predictions",
    summary: "Prediction terminal display. No trading execution.",
    capabilities: caps({
      displaysData: true,
      handlesFinance: true,
      requiresSensitiveModeGate: true,
    }),
  }),
  policy({
    mode: "NETWORK",
    category: "security_surface",
    riskLevel: "elevated",
    readiness: "needs_manual_review",
    label: "Network",
    summary: "Network map surface; network intelligence display.",
    capabilities: caps({ displaysData: true, canReadUserData: true }),
  }),
  policy({
    mode: "HACKING",
    category: "security_surface",
    riskLevel: "critical",
    readiness: "blocked_until_dedicated_policy",
    label: "Hacking",
    summary: "Hacking terminal surface; offensive-security oriented.",
    capabilities: caps({
      displaysData: true,
      securityOrHackingSurface: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "REPORTS",
    category: "data_surface",
    riskLevel: "elevated",
    readiness: "ready_for_display_governance",
    label: "Reports",
    summary: "Investigation reports; read-only report display.",
    capabilities: caps({ displaysData: true, canReadUserData: true }),
  }),
  policy({
    mode: "GEO",
    category: "security_surface",
    riskLevel: "elevated",
    readiness: "needs_manual_review",
    label: "Geo",
    summary: "Geo-tactical view; location/intelligence display.",
    capabilities: caps({ displaysData: true, canReadUserData: true }),
  }),
  policy({
    mode: "LIVE",
    category: "media_surface",
    riskLevel: "elevated",
    readiness: "needs_manual_review",
    label: "Live",
    summary: "Live content display surface (media-oriented).",
    capabilities: caps({ displaysData: true, playsMedia: true }),
  }),
  policy({
    mode: "FILES",
    category: "file_surface",
    riskLevel: "high",
    readiness: "blocked_until_dedicated_policy",
    label: "Files",
    summary: "Mobile file browser surface. Needs a dedicated file policy.",
    capabilities: caps({
      displaysData: true,
      handlesFiles: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "VISION",
    category: "vision_surface",
    riskLevel: "critical",
    readiness: "blocked_until_dedicated_policy",
    label: "Vision",
    summary: "Vision HUD surface. Needs a dedicated screen/camera/vision policy.",
    capabilities: caps({
      displaysData: true,
      handlesVision: true,
      captureEnabled: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "RECORDER",
    category: "recorder_surface",
    riskLevel: "critical",
    readiness: "blocked_until_dedicated_policy",
    label: "Recorder",
    summary: "Luca recorder surface. Needs a dedicated recorder/capture policy.",
    capabilities: caps({
      displaysData: true,
      recordsMedia: true,
      captureEnabled: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "TELEGRAM",
    category: "messaging_surface",
    riskLevel: "critical",
    readiness: "blocked_until_dedicated_policy",
    label: "Telegram",
    summary: "Telegram manager. Messaging/identity sensitive.",
    capabilities: caps({
      displaysData: true,
      handlesMessaging: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
      canReadUserData: true,
      credentialSensitive: true,
    }),
  }),
  policy({
    mode: "WHATSAPP",
    category: "messaging_surface",
    riskLevel: "critical",
    readiness: "blocked_until_dedicated_policy",
    label: "WhatsApp",
    summary: "WhatsApp manager. Messaging/identity sensitive.",
    capabilities: caps({
      displaysData: true,
      handlesMessaging: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
      canReadUserData: true,
      credentialSensitive: true,
    }),
  }),
  policy({
    mode: "WIRELESS",
    category: "wireless_surface",
    riskLevel: "critical",
    readiness: "blocked_until_dedicated_policy",
    label: "Wireless",
    summary: "Wireless manager. Device/network sensitive.",
    capabilities: caps({
      displaysData: true,
      handlesWireless: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canExecuteExternalAction: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "INGESTION",
    category: "ingestion_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Ingestion",
    summary: "Ingestion modal. Data import sensitive.",
    capabilities: caps({
      displaysData: true,
      handlesIngestion: true,
      handlesFiles: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
      canReadUserData: true,
    }),
  }),
  policy({
    mode: "TACTICAL",
    category: "tactical_surface",
    riskLevel: "high",
    readiness: "needs_sensitive_mode_gate",
    label: "Tactical",
    summary: "Tactical stream surface; security/operational themed.",
    capabilities: caps({
      displaysData: true,
      securityOrHackingSurface: true,
      requiresUserApproval: true,
      requiresAuditLog: true,
      requiresSensitiveModeGate: true,
    }),
  }),
];

/** Immutable map of every VisualCore surface mode → its audit policy. */
export const VISUAL_CORE_SURFACE_POLICIES: Readonly<
  Record<VisualCoreSurfaceMode, VisualCoreSurfacePolicy>
> = Object.freeze(
  POLICY_SEEDS.reduce(
    (acc, p) => {
      acc[p.mode] = p;
      return acc;
    },
    {} as Record<VisualCoreSurfaceMode, VisualCoreSurfacePolicy>,
  ),
);

/** Audit policy for a single mode. */
export function getVisualCoreSurfacePolicy(
  mode: VisualCoreSurfaceMode,
): VisualCoreSurfacePolicy {
  return VISUAL_CORE_SURFACE_POLICIES[mode];
}

/** Every surface policy, in declared mode order. */
export function listVisualCoreSurfacePolicies(): VisualCoreSurfacePolicy[] {
  return VISUAL_CORE_SURFACE_MODES.map((mode) => VISUAL_CORE_SURFACE_POLICIES[mode]);
}

function emptyCountRecord<K extends string>(keys: K[]): Record<K, number> {
  return keys.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<K, number>,
  );
}

/** Aggregate audit counts across every classified mode. */
export function getVisualCoreArchitectureAuditSummary(): VisualCoreArchitectureAuditSummary {
  const policies = listVisualCoreSurfacePolicies();

  const byCategory = emptyCountRecord<VisualCoreSurfaceCategory>(
    VISUAL_CORE_SURFACE_CATEGORIES,
  );
  const byRiskLevel = emptyCountRecord<VisualCoreSurfaceRiskLevel>(
    VISUAL_CORE_SURFACE_RISK_LEVELS,
  );
  const byReadiness = emptyCountRecord<VisualCoreGovernanceReadiness>(
    VISUAL_CORE_GOVERNANCE_READINESS_STATES,
  );

  for (const p of policies) {
    byCategory[p.category] += 1;
    byRiskLevel[p.riskLevel] += 1;
    byReadiness[p.readiness] += 1;
  }

  const sensitiveModes = policies.filter((p) => p.sensitive).map((p) => p.mode);
  const criticalModes = policies
    .filter((p) => p.riskLevel === "critical")
    .map((p) => p.mode);
  const readyForDisplayGovernanceModes = policies
    .filter((p) => p.readiness === "ready_for_display_governance")
    .map((p) => p.mode);

  return {
    totalModes: policies.length,
    byCategory,
    byRiskLevel,
    byReadiness,
    sensitiveModes,
    sensitiveModeCount: sensitiveModes.length,
    criticalModes,
    criticalModeCount: criticalModes.length,
    readyForDisplayGovernanceModes,
    readyForDisplayGovernanceCount: readyForDisplayGovernanceModes.length,
    governanceApplied: false,
  };
}

/** Human-readable, conservative governance recommendation for a mode. */
export function getVisualCoreGovernanceRecommendation(
  mode: VisualCoreSurfaceMode,
): string {
  const p = getVisualCoreSurfacePolicy(mode);
  switch (p.readiness) {
    case "ready_for_display_governance":
      return `${p.label}: low-risk display surface — eligible for governed display session records first. Do not wrap behavior.`;
    case "needs_runtime_adapter":
      return `${p.label}: needs a governed runtime adapter (e.g. governed LucaBrowser mode) before governance.`;
    case "needs_manual_review":
      return `${p.label}: requires manual review before any governance is designed.`;
    case "needs_sensitive_mode_gate":
      return `${p.label}: sensitive surface — gate behind a sensitive-mode approval before governing.`;
    case "blocked_until_dedicated_policy":
      return `${p.label}: blocked until a dedicated per-mode policy exists. Do not govern generically.`;
    default:
      return `${p.label}: manual review required.`;
  }
}

/** High/critical-risk modes — the unsafe/sensitive surfaces. */
export function getVisualCoreUnsafeOrSensitiveModes(): VisualCoreSurfaceMode[] {
  return listVisualCoreSurfacePolicies()
    .filter((p) => p.riskLevel === "high" || p.riskLevel === "critical")
    .map((p) => p.mode);
}

/** Modes recommended as ready for display-governance first (low-risk display). */
export function getVisualCoreReadyForDisplayGovernanceModes(): VisualCoreSurfaceMode[] {
  return listVisualCoreSurfacePolicies()
    .filter((p) => p.readiness === "ready_for_display_governance")
    .map((p) => p.mode);
}
