// OverlayManagerGovernancePolicy — PR #148: OverlayManager Architecture Audit.
//
// AUDIT/MAP layer only. This module classifies every overlay surface currently
// rendered or coordinated by src/components/layout/OverlayManager.tsx (plus the
// related Android native overlay subsystem) by capability + risk and records a
// conservative "current posture" plus follow-up recommendations.
//
// Hard guarantees:
//   - This file NEVER changes OverlayManager runtime behavior, adds/removes
//     overlays, or changes z-index / focus / pointer-events behavior.
//   - It NEVER adds automation, capture, DOM reading, screenshot/OCR/vision,
//     file access, messaging, wireless/device control, or tool execution.
//   - Every capability flag describes a capability the surface *exposes today*,
//     not a capability this layer enables. Nothing here turns anything on.
//   - Posture labels and recommendations are descriptions / suggestions for
//     FUTURE PRs, not a claim that any surface is safe to govern now.

import {
  OVERLAY_POSTURES,
  OVERLAY_SURFACE_CATEGORIES,
  OVERLAY_SURFACE_IDS,
  OVERLAY_SURFACE_RISK_LEVELS,
  type OverlayManagerArchitectureAuditSummary,
  type OverlayPosture,
  type OverlaySurfaceCapabilityFlags,
  type OverlaySurfaceCategory,
  type OverlaySurfaceId,
  type OverlaySurfacePolicy,
  type OverlaySurfaceRiskLevel,
} from "../../types/overlayManagerGovernance";

/** Default capability flags — everything off. Surfaces override only what applies. */
function caps(
  overrides: Partial<OverlaySurfaceCapabilityFlags>,
): OverlaySurfaceCapabilityFlags {
  return {
    displaysOnly: false,
    displaysBrowserContent: false,
    receivesRemoteCommands: false,
    opensExternalSurface: false,
    triggersVisualCoreModeTransition: false,
    capturesInput: false,
    capturesScreenOrCamera: false,
    accessesFiles: false,
    invokesTools: false,
    affectsMessaging: false,
    affectsWirelessOrDeviceControl: false,
    ipcOrEventBusDriven: false,
    requestsSystemPermission: false,
    canBypassVisualCoreGovernance: false,
    presentsApprovalGateToday: false,
    recommendSessionRecord: false,
    recommendSensitiveGate: false,
    recommendAuditLog: false,
    ...overrides,
  };
}

/**
 * A surface is "sensitive" when it is high/critical risk, or when it is already
 * labelled sensitive-surface / blocked-until-policy in its current posture.
 */
function isSensitive(
  riskLevel: OverlaySurfaceRiskLevel,
  postures: OverlayPosture[],
): boolean {
  if (riskLevel === "high" || riskLevel === "critical") return true;
  return (
    postures.includes("sensitive-surface") ||
    postures.includes("blocked-until-policy")
  );
}

interface PolicySeed {
  id: OverlaySurfaceId;
  category: OverlaySurfaceCategory;
  riskLevel: OverlaySurfaceRiskLevel;
  postures: OverlayPosture[];
  label: string;
  source: string;
  summary: string;
  capabilities: OverlaySurfaceCapabilityFlags;
  notes?: string[];
}

function policy(seed: PolicySeed): OverlaySurfacePolicy {
  return {
    ...seed,
    sensitive: isSensitive(seed.riskLevel, seed.postures),
  };
}

const OVERLAY_SOURCE = "src/components/layout/OverlayManager.tsx";

const POLICY_SEEDS: OverlaySurfacePolicy[] = [
  policy({
    id: "presence_monitor",
    category: "presence_vision",
    riskLevel: "high",
    postures: ["local-ui-only", "sensitive-surface", "needs-governance"],
    label: "PresenceMonitor",
    source: OVERLAY_SOURCE,
    summary:
      "Ambient presence/mood detector that samples the camera on a duty cycle and reports presence to awarenessService.",
    capabilities: caps({
      capturesScreenOrCamera: true,
      canBypassVisualCoreGovernance: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: [
      "Runs outside VisualCore — ambient camera sampling is not behind any VisualCore mode gate.",
      "Audit-only finding: no per-activation approval or audit record today.",
    ],
  }),
  policy({
    id: "screen_share",
    category: "capture_surface",
    riskLevel: "high",
    postures: ["local-ui-only", "sensitive-surface", "needs-governance"],
    label: "ScreenShare",
    source: OVERLAY_SOURCE,
    summary:
      "Screen-capture surface that emits captured frames via onFrameCapture when isScreenSharing is active.",
    capabilities: caps({
      capturesScreenOrCamera: true,
      canBypassVisualCoreGovernance: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: [
      "Capture is toggled by the isScreenSharing prop owned by App.tsx; no governed session record today.",
    ],
  }),
  policy({
    id: "autonomous_action_banner",
    category: "passive_display",
    riskLevel: "low",
    postures: ["display-only", "local-ui-only"],
    label: "Autonomous action banner",
    source: OVERLAY_SOURCE,
    summary:
      "Read-only banner (z-[1000]) showing the active autonomous action domain/intent.",
    capabilities: caps({ displaysOnly: true }),
  }),
  policy({
    id: "app_background",
    category: "passive_display",
    riskLevel: "low",
    postures: ["display-only", "local-ui-only"],
    label: "App background layer",
    source: OVERLAY_SOURCE,
    summary: "Decorative blurred background image layer (z-0).",
    capabilities: caps({ displaysOnly: true }),
  }),
  policy({
    id: "ghost_cursor",
    category: "passive_display",
    riskLevel: "low",
    postures: ["display-only", "local-ui-only"],
    label: "GhostCursor",
    source: OVERLAY_SOURCE,
    summary:
      "Visual indicator that renders the agent ('ghost') cursor position; it visualizes automation but does not itself perform input.",
    capabilities: caps({ displaysOnly: true }),
    notes: [
      "Reflects automation activity but does not click/type/scroll itself.",
    ],
  }),
  policy({
    id: "reboot_overlay",
    category: "passive_display",
    riskLevel: "low",
    postures: ["display-only", "local-ui-only"],
    label: "Reboot overlay",
    source: OVERLAY_SOURCE,
    summary:
      "Full-screen 'SYSTEM REBOOT' overlay shown while isRebooting; highest inline z-index (z-[2000]) and pointer-events-auto.",
    capabilities: caps({ displaysOnly: true }),
    notes: [
      "Carries the highest hard-coded z-index in OverlayManager (z-[2000]) and pointer-events-auto, so it blocks interaction while shown.",
    ],
  }),
  policy({
    id: "live_content",
    category: "passive_display",
    riskLevel: "elevated",
    postures: ["display-only", "local-ui-only", "needs-governance"],
    label: "LiveContentDisplay",
    source: OVERLAY_SOURCE,
    summary:
      "Renders an arbitrary liveContent payload supplied by the app; closeable via onClose.",
    capabilities: caps({
      displaysOnly: true,
      recommendSessionRecord: true,
    }),
    notes: [
      "Manual review: confirm what content types liveContent can carry (e.g. remote/web/media) before treating it as display-only.",
    ],
  }),
  policy({
    id: "security_gate",
    category: "approval_surface",
    riskLevel: "elevated",
    postures: ["input-capable", "local-ui-only"],
    label: "SecurityGate",
    source: OVERLAY_SOURCE,
    summary:
      "Approval/deny modal for tool execution (approvalRequest); resolves the pending request on Approve/Deny.",
    capabilities: caps({
      capturesInput: true,
      presentsApprovalGateToday: true,
      recommendAuditLog: true,
    }),
    notes: [
      "This IS the existing per-tool approval surface.",
      "Bypass concern: VoiceHud can resolve this same approvalRequest by voice (affirmative/negative words) without touching this modal.",
    ],
  }),
  policy({
    id: "voice_hud",
    category: "voice_surface",
    riskLevel: "high",
    postures: [
      "input-capable",
      "local-ui-only",
      "visualcore-linked",
      "sensitive-surface",
      "needs-governance",
    ],
    label: "VoiceHud",
    source: OVERLAY_SOURCE,
    summary:
      "Voice overlay: captures speech, drives the realtime voice runtime, enqueues commands to the task queue, and shares visualData with VisualCore.",
    capabilities: caps({
      capturesInput: true,
      invokesTools: true,
      canBypassVisualCoreGovernance: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: [
      "taskQueue.add(text) enqueues voice commands — an indirect path to tool execution.",
      "Can resolve the SecurityGate approvalRequest by voice (approve/deny) — a governance bypass path to flag for a future PR.",
      "Shares the visualData channel consumed by VisualCore (visualcore-linked).",
    ],
  }),
  policy({
    id: "voice_command_confirmation",
    category: "voice_surface",
    riskLevel: "elevated",
    postures: ["input-capable", "local-ui-only", "needs-governance"],
    label: "VoiceCommandConfirmation",
    source: OVERLAY_SOURCE,
    summary:
      "Confirmation modal for risky/low-confidence voice commands; on confirm it enqueues the command to the task queue.",
    capabilities: caps({
      capturesInput: true,
      invokesTools: true,
      presentsApprovalGateToday: true,
      recommendAuditLog: true,
    }),
  }),
  policy({
    id: "vision_camera",
    category: "capture_surface",
    riskLevel: "high",
    postures: [
      "input-capable",
      "local-ui-only",
      "sensitive-surface",
      "needs-governance",
    ],
    label: "VisionCameraModal",
    source: OVERLAY_SOURCE,
    summary:
      "Camera modal: captures images (onCapture) and live-analyzes frames via lucaService.analyzeImageFast (onLiveAnalyze).",
    capabilities: caps({
      capturesScreenOrCamera: true,
      capturesInput: true,
      invokesTools: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
  }),
  policy({
    id: "remote_access",
    category: "remote_access_surface",
    riskLevel: "high",
    postures: [
      "remote-command-capable",
      "local-ui-only",
      "sensitive-surface",
      "needs-governance",
    ],
    label: "RemoteAccessModal",
    source: OVERLAY_SOURCE,
    summary:
      "Remote-access pairing modal (access code); invokes handleRemoteSuccess on a successful remote handshake.",
    capabilities: caps({
      receivesRemoteCommands: true,
      opensExternalSurface: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: ["Pairs with the Luca Link remote-control path."],
  }),
  policy({
    id: "desktop_stream",
    category: "capture_surface",
    riskLevel: "high",
    postures: [
      "remote-command-capable",
      "local-ui-only",
      "sensitive-surface",
      "needs-governance",
    ],
    label: "DesktopStreamModal",
    source: OVERLAY_SOURCE,
    summary:
      "Desktop streaming modal bound to a desktopTarget and the local core connection.",
    capabilities: caps({
      capturesScreenOrCamera: true,
      opensExternalSurface: true,
      receivesRemoteCommands: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
  }),
  policy({
    id: "luca_recorder",
    category: "capture_surface",
    riskLevel: "high",
    postures: ["local-ui-only", "sensitive-surface", "needs-governance"],
    label: "LucaRecorder",
    source: OVERLAY_SOURCE,
    summary:
      "Records video/screen 'imprints', uploads the blob to /api/skills/imprint, and registers the result as an executable agent skill.",
    capabilities: caps({
      capturesScreenOrCamera: true,
      invokesTools: true,
      accessesFiles: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: [
      "Saved recordings are registered as agent SKILLS, so the recorder is an authoring path for future executable behavior.",
    ],
  }),
  policy({
    id: "human_input",
    category: "approval_surface",
    riskLevel: "high",
    postures: [
      "input-capable",
      "local-ui-only",
      "sensitive-surface",
      "needs-governance",
    ],
    label: "HumanInputModal",
    source: OVERLAY_SOURCE,
    summary:
      "Generic human-input prompt; switches to password mode when the prompt mentions 'password' and to save mode for 'save'/'store'.",
    capabilities: caps({
      capturesInput: true,
      recommendAuditLog: true,
    }),
    notes: [
      "Credential-sensitive: can collect passwords/secrets from the operator.",
    ],
  }),
  policy({
    id: "shared_overlay_panels",
    category: "panel_group",
    riskLevel: "high",
    postures: [
      "local-ui-only",
      "remote-command-capable",
      "sensitive-surface",
      "needs-governance",
    ],
    label: "SharedOverlayPanels (group)",
    source: "src/surfaces/shared/SharedOverlayPanels.tsx",
    summary:
      "Composite group of shared panels: messaging managers (WhatsApp/Telegram/Twitter/Instagram/LinkedIn/Discord/YouTube/WeChat), Luca Link, ProfileManager, CodeEditor, Ingestion, AppExplorer, MobileFileBrowser, MobileManager.",
    capabilities: caps({
      affectsMessaging: true,
      accessesFiles: true,
      opensExternalSurface: true,
      receivesRemoteCommands: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: [
      "Each panel is already classified by audience tier + build capability in src/surfaces/overlaySurfacePolicy.ts (build-time gating), but there is no runtime overlay-session governance.",
      "Includes file surfaces (CodeEditor, MobileFileBrowser, Ingestion) and the Luca Link remote-pairing modal.",
    ],
  }),
  policy({
    id: "origin_overlay_panels",
    category: "panel_group",
    riskLevel: "critical",
    postures: [
      "local-ui-only",
      "remote-command-capable",
      "sensitive-surface",
      "needs-governance",
      "blocked-until-policy",
    ],
    label: "OriginOverlayPanels (group)",
    source: "src/surfaces/origin/OriginOverlayPanels.tsx",
    summary:
      "Composite group of origin-only panels: admin/root grant, lockdown override, autonomy/agent dashboards, geo-tactical, trading terminals, OSINT, TV remote, wireless manager, network map, hacking terminal, skills matrix, and subsystem dashboard.",
    capabilities: caps({
      invokesTools: true,
      affectsWirelessOrDeviceControl: true,
      opensExternalSurface: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: [
      "adminGrant grants ROOT/administrator access; lockdown override clears lockdown — both are critical control surfaces.",
      "hackingTerminal is destructive; tvRemote calls executeTool('controlSmartTV'); wirelessManager calls handleWirelessConnect; skillsMatrix calls executeTool('executeCustomSkill') — direct tool execution and device control.",
      "Build-time gated to origin/tactical tiers via src/surfaces/overlaySurfacePolicy.ts, but NOT runtime-governed with approval/audit/session records.",
    ],
  }),
  policy({
    id: "android_native_overlay",
    category: "native_widget_surface",
    riskLevel: "high",
    postures: [
      "widget-linked",
      "input-capable",
      "local-ui-only",
      "sensitive-surface",
      "needs-governance",
      "blocked-until-policy",
    ],
    label: "Android native overlay (LucaOverlay plugin)",
    source:
      "src/plugins/luca-overlay/index.ts, src/services/overlayService.ts, src/services/overlayIntegration.ts",
    summary:
      "Android-only floating hologram/chat widgets drawn over other apps; continuous 'Sentry Mode' voice listening that sends messages to lucaService and speaks responses via TTS.",
    capabilities: caps({
      capturesInput: true,
      invokesTools: true,
      requestsSystemPermission: true,
      canBypassVisualCoreGovernance: true,
      ipcOrEventBusDriven: true,
      recommendSensitiveGate: true,
      recommendAuditLog: true,
    }),
    notes: [
      "Requests SYSTEM_ALERT_WINDOW ('draw over other apps') and renders outside the LucaOS window entirely.",
      "overlayIntegration forwards overlay voice/chat to lucaService.sendMessage — an entry point to the agent runtime that is independent of VisualCore and OverlayManager governance.",
      "Continuous wake-word listening (Sentry Mode) processes audio outside any per-activation gate.",
      "This is the system's other 'overlay manager'; it is coordinated separately from the React OverlayManager and is the most clearly needs-governance + blocked-until-policy surface.",
    ],
  }),
];

/** Immutable map of every overlay surface id → its audit policy. */
export const OVERLAY_SURFACE_POLICIES: Readonly<
  Record<OverlaySurfaceId, OverlaySurfacePolicy>
> = Object.freeze(
  POLICY_SEEDS.reduce(
    (acc, p) => {
      acc[p.id] = p;
      return acc;
    },
    {} as Record<OverlaySurfaceId, OverlaySurfacePolicy>,
  ),
);

/** Audit policy for a single overlay surface. */
export function getOverlaySurfacePolicy(
  id: OverlaySurfaceId,
): OverlaySurfacePolicy {
  return OVERLAY_SURFACE_POLICIES[id];
}

/** Every surface policy, in declared render order. */
export function listOverlaySurfacePolicies(): OverlaySurfacePolicy[] {
  return OVERLAY_SURFACE_IDS.map((id) => OVERLAY_SURFACE_POLICIES[id]);
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

/** Aggregate audit counts across every classified overlay surface. */
export function getOverlayManagerArchitectureAuditSummary(): OverlayManagerArchitectureAuditSummary {
  const policies = listOverlaySurfacePolicies();

  const byCategory = emptyCountRecord<OverlaySurfaceCategory>(
    OVERLAY_SURFACE_CATEGORIES,
  );
  const byRiskLevel = emptyCountRecord<OverlaySurfaceRiskLevel>(
    OVERLAY_SURFACE_RISK_LEVELS,
  );
  const byPosture = emptyCountRecord<OverlayPosture>(OVERLAY_POSTURES);

  for (const p of policies) {
    byCategory[p.category] += 1;
    byRiskLevel[p.riskLevel] += 1;
    for (const posture of p.postures) byPosture[posture] += 1;
  }

  const sensitiveSurfaces = policies.filter((p) => p.sensitive).map((p) => p.id);
  const criticalSurfaces = policies
    .filter((p) => p.riskLevel === "critical")
    .map((p) => p.id);
  const needsGovernanceSurfaces = policies
    .filter((p) => p.postures.includes("needs-governance"))
    .map((p) => p.id);
  const blockedUntilPolicySurfaces = policies
    .filter((p) => p.postures.includes("blocked-until-policy"))
    .map((p) => p.id);
  const displayOnlySurfaces = policies
    .filter((p) => p.postures.includes("display-only"))
    .map((p) => p.id);

  return {
    totalSurfaces: policies.length,
    byCategory,
    byRiskLevel,
    byPosture,
    sensitiveSurfaces,
    sensitiveSurfaceCount: sensitiveSurfaces.length,
    criticalSurfaces,
    criticalSurfaceCount: criticalSurfaces.length,
    needsGovernanceSurfaces,
    needsGovernanceCount: needsGovernanceSurfaces.length,
    blockedUntilPolicySurfaces,
    blockedUntilPolicyCount: blockedUntilPolicySurfaces.length,
    displayOnlySurfaces,
    displayOnlyCount: displayOnlySurfaces.length,
    governanceApplied: false,
  };
}

/** Human-readable, conservative governance recommendation for a surface. */
export function getOverlaySurfaceRecommendation(id: OverlaySurfaceId): string {
  const p = getOverlaySurfacePolicy(id);
  if (p.postures.includes("blocked-until-policy")) {
    return `${p.label}: blocked until a dedicated per-surface policy exists. Do not govern generically or wrap blindly.`;
  }
  if (p.postures.includes("needs-governance")) {
    return `${p.label}: sensitive/capable surface — design a governed overlay session record + approval/audit before changing behavior.`;
  }
  if (p.postures.includes("display-only")) {
    return `${p.label}: low-risk display-only surface — eligible for a lightweight governed session record first. Do not change behavior.`;
  }
  return `${p.label}: manual review required before any governance is designed.`;
}

/** Surfaces flagged needs-governance in their current posture. */
export function getOverlayNeedsGovernanceSurfaces(): OverlaySurfaceId[] {
  return listOverlaySurfacePolicies()
    .filter((p) => p.postures.includes("needs-governance"))
    .map((p) => p.id);
}

/** Surfaces blocked until a dedicated per-surface policy exists. */
export function getOverlayBlockedUntilPolicySurfaces(): OverlaySurfaceId[] {
  return listOverlaySurfacePolicies()
    .filter((p) => p.postures.includes("blocked-until-policy"))
    .map((p) => p.id);
}

/** Low-risk display-only surfaces — safe candidates for first governance. */
export function getOverlayDisplayOnlySurfaces(): OverlaySurfaceId[] {
  return listOverlaySurfacePolicies()
    .filter((p) => p.postures.includes("display-only"))
    .map((p) => p.id);
}
