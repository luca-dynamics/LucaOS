// OverlayManagerArchitectureAudit — PR #148: OverlayManager Architecture Audit.
//
// AUDIT/MAP layer only. Produces a read-only narrative report of the existing
// OverlayManager architecture and the governance gaps to address in FUTURE PRs.
//
// Hard guarantees:
//   - This file NEVER governs, wraps, gates, or executes any overlay.
//   - It NEVER changes overlay registration, show/hide, z-index, focus,
//     pointer-events, or IPC/eventBus behavior.
//   - It only reads the audit policy map and emits findings/gaps/next-steps.

import type { OverlayManagerArchitectureAuditSummary } from "../../types/overlayManagerGovernance";
import {
  getOverlayBlockedUntilPolicySurfaces,
  getOverlayDisplayOnlySurfaces,
  getOverlayManagerArchitectureAuditSummary,
  getOverlayNeedsGovernanceSurfaces,
} from "./OverlayManagerGovernancePolicy";

export interface OverlayManagerArchitectureReport {
  /** One-line characterization of what OverlayManager is. */
  overview: string;
  /** Architectural findings about the current overlay orchestration surface. */
  findings: string[];
  /** Governance gaps to be closed by future PRs. */
  governanceGaps: string[];
  /** Conservative, ordered next steps. */
  recommendedNextSteps: string[];
  /** Aggregate audit counts. */
  summary: OverlayManagerArchitectureAuditSummary;
}

/** Architectural findings about the current OverlayManager surface. */
export function getOverlayManagerArchitectureFindings(): string[] {
  return [
    "OverlayManager is a flat React fragment that conditionally renders ~18 overlay surfaces; it is NOT a stacking/priority manager.",
    "There is no overlay registration, no priority queue, and no central z-index manager — z-index is hard-coded inline per overlay (e.g. banner z-[1000], reboot overlay z-[2000]).",
    "Visibility is driven entirely by show* boolean props owned by App.tsx; OverlayManager itself holds no overlay state and performs no open/close logic of its own.",
    "Focus and pointer-events are per-overlay (e.g. the reboot overlay uses pointer-events-auto to block input); OverlayManager does not centrally manage focus or input routing.",
    "Capture surfaces (PresenceMonitor, ScreenShare, VisionCameraModal, DesktopStreamModal, LucaRecorder) render here and sit outside VisualCore's governance router.",
    "VoiceHud is input-capable: it enqueues commands via taskQueue.add and can resolve the SecurityGate approvalRequest by voice — a governance bypass path.",
    "The Android native overlay (LucaOverlay plugin via overlayService/overlayIntegration) is a separate overlay subsystem: it draws over other apps (SYSTEM_ALERT_WINDOW) and forwards voice/chat to lucaService — an agent entry point independent of VisualCore and OverlayManager.",
    "Panel groups (SharedOverlayPanels, OriginOverlayPanels) are already build-time gated by audience tier + capability in src/surfaces/overlaySurfacePolicy.ts, but have no runtime overlay-session governance.",
    "No OverlayManager surface displays browser content directly today; browser surfaces live in VisualCore / LucaBrowser (audited in PR #140/#143).",
    "No OverlayManager surface directly triggers a VisualCore mode transition; those flow through VisualCore's own IPC/remote-command path (audited in PR #140/#145/#146).",
  ];
}

/** Governance gaps to be closed by future PRs. */
export function getOverlayManagerGovernanceGaps(): string[] {
  const needsGovernance = getOverlayNeedsGovernanceSurfaces();
  const blocked = getOverlayBlockedUntilPolicySurfaces();
  return [
    `No overlay session records: ${needsGovernance.length} capable/sensitive surfaces open with no governed record, approval, or audit trail (${needsGovernance.join(", ")}).`,
    "Voice approval bypass: VoiceHud can approve/deny the SecurityGate request by voice, sidestepping the visual approval surface.",
    "Ungoverned capture: PresenceMonitor/ScreenShare/VisionCameraModal/DesktopStreamModal/LucaRecorder capture camera/screen/audio with no per-activation gate.",
    "Tool-execution entry points: VoiceHud, VoiceCommandConfirmation, LucaRecorder (skill imprint), and OriginOverlayPanels (controlSmartTV / executeCustomSkill) can reach tool execution from overlay UI.",
    `Critical control surfaces: OriginOverlayPanels exposes ROOT/admin grant, lockdown override, and a destructive hacking terminal — blocked-until-policy surfaces (${blocked.join(", ")}).`,
    "Separate native overlay: the Android LucaOverlay subsystem is an agent entry point outside VisualCore governance and is not covered by any overlay policy today.",
    "No central z-index/focus/pointer-events authority: stacking and input-blocking are decided ad hoc per overlay, with no governed ordering.",
  ];
}

/** Conservative, ordered next steps. */
export function getOverlayManagerRecommendedNextSteps(): string[] {
  const displayOnly = getOverlayDisplayOnlySurfaces();
  return [
    "Introduce governance via overlay session records + per-surface gates — NOT a broad rewrite of OverlayManager.",
    `First govern low-risk display-only surfaces (${displayOnly.join(", ")}) with lightweight governed session records.`,
    "Close the VoiceHud approval bypass: route voice approve/deny through the same governed approval path as SecurityGate.",
    "Gate capture surfaces (camera/screen/recorder) behind explicit sensitive-surface approval + audit, one surface at a time.",
    "Treat the Android native overlay as its own governed entry point with a dedicated policy before it forwards messages to lucaService.",
    "Do NOT wrap all overlays blindly; critical surfaces (ROOT grant, lockdown, hacking terminal) stay blocked until a dedicated per-surface policy exists.",
  ];
}

/** Build the full read-only architecture report. */
export function buildOverlayManagerArchitectureReport(): OverlayManagerArchitectureReport {
  return {
    overview:
      "OverlayManager is a flat overlay orchestration fragment that conditionally renders ~18 surfaces (display, voice, capture, approval, remote, panel groups) driven by App.tsx props, alongside a separate Android native overlay subsystem. This report is an audit map only — no governance is applied.",
    findings: getOverlayManagerArchitectureFindings(),
    governanceGaps: getOverlayManagerGovernanceGaps(),
    recommendedNextSteps: getOverlayManagerRecommendedNextSteps(),
    summary: getOverlayManagerArchitectureAuditSummary(),
  };
}
