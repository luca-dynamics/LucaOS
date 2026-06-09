// OverlayManager governance audit types — PR #148: OverlayManager Architecture Audit.
//
// This is an AUDIT/MAP layer only. It describes what OverlayManager
// (the overlay orchestration fragment in src/components/layout/OverlayManager.tsx)
// and the related overlay subsystems currently render/coordinate, so governance
// can later be introduced safely — mirroring the VisualCore audit approach from
// PR #140 (src/types/visualCoreGovernance.ts).
//
// Hard guarantees — these types and the helpers built on them NEVER:
//   - change OverlayManager runtime behavior, add/remove overlays, or change
//     z-index / focus / pointer-events behavior
//   - add browser automation, click/type/scroll automation, DOM reading,
//     screenshot / OCR / vision, file access, messaging, wireless/device
//     control, or tool execution
//   - enable any sensitive surface
//
// It only classifies each existing overlay surface by capability + risk and
// records conservative "current posture" labels plus follow-up recommendations.

/**
 * Every overlay surface currently rendered or coordinated by OverlayManager.tsx
 * (and the related Android native overlay subsystem). These mirror the actual
 * components/groups OverlayManager renders today; they are NOT new overlays.
 */
export type OverlaySurfaceId =
  | "presence_monitor"
  | "screen_share"
  | "autonomous_action_banner"
  | "app_background"
  | "ghost_cursor"
  | "reboot_overlay"
  | "live_content"
  | "security_gate"
  | "voice_hud"
  | "voice_command_confirmation"
  | "vision_camera"
  | "remote_access"
  | "desktop_stream"
  | "luca_recorder"
  | "human_input"
  | "shared_overlay_panels"
  | "origin_overlay_panels"
  | "android_native_overlay";

/** Capability-oriented grouping of an overlay surface. */
export type OverlaySurfaceCategory =
  | "passive_display"
  | "presence_vision"
  | "capture_surface"
  | "voice_surface"
  | "approval_surface"
  | "remote_access_surface"
  | "panel_group"
  | "native_widget_surface"
  | "unknown_surface";

/** Conservative risk classification for an overlay surface. */
export type OverlaySurfaceRiskLevel = "low" | "elevated" | "high" | "critical";

/**
 * "Current posture" labels for an overlay surface, as requested by the PR #148
 * audit brief. A surface may carry several labels at once. These describe the
 * surface as it exists TODAY — none of them turn any capability on.
 */
export type OverlayPosture =
  | "display-only"
  | "local-ui-only"
  | "remote-command-capable"
  | "browser-capable"
  | "input-capable"
  | "visualcore-linked"
  | "widget-linked"
  | "sensitive-surface"
  | "needs-governance"
  | "blocked-until-policy";

/**
 * Audit-only capability flags. A `true` value describes a capability the
 * surface *exposes today*, NOT a capability this layer enables. The trailing
 * `recommend*` flags are conservative recommendations for FUTURE PRs only.
 */
export interface OverlaySurfaceCapabilityFlags {
  /** Surface only paints pixels; no input, capture, command, or side effects. */
  displaysOnly: boolean;
  /** Renders web/browser content inside the overlay. */
  displaysBrowserContent: boolean;
  /** Can be opened/driven by a remote command path (IPC / LucaLink / remote). */
  receivesRemoteCommands: boolean;
  /** Opens an external surface (remote desktop, native settings, device, etc.). */
  opensExternalSurface: boolean;
  /** Can trigger a VisualCore / Luca Screen mode transition. */
  triggersVisualCoreModeTransition: boolean;
  /** Captures keyboard/text/voice input from the user. */
  capturesInput: boolean;
  /** Captures screen frames, camera frames, or audio/video recordings. */
  capturesScreenOrCamera: boolean;
  /** Reads or writes user files / file-system surfaces. */
  accessesFiles: boolean;
  /** Can invoke tools / enqueue tasks / send messages to the agent runtime. */
  invokesTools: boolean;
  /** Touches messaging surfaces (WhatsApp/Telegram/etc.). */
  affectsMessaging: boolean;
  /** Touches wireless pairing or device control (BT/WiFi/TV/desktop). */
  affectsWirelessOrDeviceControl: boolean;
  /** Driven by Electron IPC, the eventBus, or window events. */
  ipcOrEventBusDriven: boolean;
  /** Requests a system-level permission (e.g. SYSTEM_ALERT_WINDOW). */
  requestsSystemPermission: boolean;
  /** Operates entirely outside VisualCore's governance router today. */
  canBypassVisualCoreGovernance: boolean;
  /** Surface already presents an approval/confirmation gate today. */
  presentsApprovalGateToday: boolean;
  /** Recommendation (future PR): wrap in a governed overlay session record. */
  recommendSessionRecord: boolean;
  /** Recommendation (future PR): gate behind explicit sensitive-surface approval. */
  recommendSensitiveGate: boolean;
  /** Recommendation (future PR): emit an audit-log entry on open/close. */
  recommendAuditLog: boolean;
}

/**
 * The full audit classification of a single overlay surface. This is a
 * description of existing architecture, not a runtime contract.
 */
export interface OverlaySurfacePolicy {
  id: OverlaySurfaceId;
  category: OverlaySurfaceCategory;
  riskLevel: OverlaySurfaceRiskLevel;
  /** "Current posture" labels describing the surface as it exists today. */
  postures: OverlayPosture[];
  /** True when this surface is operationally sensitive (high/critical or gated). */
  sensitive: boolean;
  /** User-facing label / component name for the surface. */
  label: string;
  /** Source location(s) where the surface is rendered/coordinated. */
  source: string;
  /** Short audit-only description of what the surface displays/does today. */
  summary: string;
  capabilities: OverlaySurfaceCapabilityFlags;
  /** Optional audit notes (links to VisualCore, bypass paths, existing gating). */
  notes?: string[];
}

/** Aggregate counts produced by auditing the full overlay surface map. */
export interface OverlayManagerArchitectureAuditSummary {
  totalSurfaces: number;
  byCategory: Record<OverlaySurfaceCategory, number>;
  byRiskLevel: Record<OverlaySurfaceRiskLevel, number>;
  byPosture: Record<OverlayPosture, number>;
  sensitiveSurfaces: OverlaySurfaceId[];
  sensitiveSurfaceCount: number;
  criticalSurfaces: OverlaySurfaceId[];
  criticalSurfaceCount: number;
  needsGovernanceSurfaces: OverlaySurfaceId[];
  needsGovernanceCount: number;
  blockedUntilPolicySurfaces: OverlaySurfaceId[];
  blockedUntilPolicyCount: number;
  displayOnlySurfaces: OverlaySurfaceId[];
  displayOnlyCount: number;
  /** True while no overlay surface is actually governed/wrapped yet. */
  governanceApplied: false;
}

/** Every overlay surface id, in the order OverlayManager renders them. */
export const OVERLAY_SURFACE_IDS: OverlaySurfaceId[] = [
  "presence_monitor",
  "screen_share",
  "autonomous_action_banner",
  "app_background",
  "ghost_cursor",
  "reboot_overlay",
  "live_content",
  "security_gate",
  "shared_overlay_panels",
  "voice_hud",
  "voice_command_confirmation",
  "vision_camera",
  "remote_access",
  "desktop_stream",
  "luca_recorder",
  "origin_overlay_panels",
  "human_input",
  "android_native_overlay",
];

/** All overlay surface categories. */
export const OVERLAY_SURFACE_CATEGORIES: OverlaySurfaceCategory[] = [
  "passive_display",
  "presence_vision",
  "capture_surface",
  "voice_surface",
  "approval_surface",
  "remote_access_surface",
  "panel_group",
  "native_widget_surface",
  "unknown_surface",
];

/** All risk levels, lowest → highest. */
export const OVERLAY_SURFACE_RISK_LEVELS: OverlaySurfaceRiskLevel[] = [
  "low",
  "elevated",
  "high",
  "critical",
];

/** All current-posture labels. */
export const OVERLAY_POSTURES: OverlayPosture[] = [
  "display-only",
  "local-ui-only",
  "remote-command-capable",
  "browser-capable",
  "input-capable",
  "visualcore-linked",
  "widget-linked",
  "sensitive-surface",
  "needs-governance",
  "blocked-until-policy",
];
