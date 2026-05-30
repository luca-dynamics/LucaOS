// VisualCoreArchitectureAudit — PR #140: VisualCore Architecture Audit.
//
// AUDIT/MAP layer only. Produces a read-only narrative report of the existing
// VisualCore architecture and the governance gaps to address in FUTURE PRs.
//
// Hard guarantees:
//   - This file NEVER governs, wraps, gates, or executes any VisualCore mode.
//   - It NEVER changes mode switching, IPC, or browser-mode behavior.
//   - It only reads the audit policy map and emits findings/gaps/next-steps.

import type { VisualCoreArchitectureAuditSummary } from "../../types/visualCoreGovernance";
import {
  getVisualCoreArchitectureAuditSummary,
  getVisualCoreReadyForDisplayGovernanceModes,
  getVisualCoreUnsafeOrSensitiveModes,
} from "./VisualCoreGovernancePolicy";

export interface VisualCoreArchitectureReport {
  /** One-line characterization of what VisualCore is. */
  overview: string;
  /** Architectural findings about the current VisualCore surface. */
  findings: string[];
  /** Governance gaps to be closed by future PRs. */
  governanceGaps: string[];
  /** Conservative, ordered next steps. */
  recommendedNextSteps: string[];
  /** Aggregate audit counts. */
  summary: VisualCoreArchitectureAuditSummary;
}

/** Architectural findings about the current VisualCore surface. */
export function getVisualCoreArchitectureFindings(): string[] {
  return [
    "VisualCore is a large visual operating surface / HUD router, not a simple screen component.",
    "It mixes display-only modes (IDLE, DATA, DATA_ROOM, REPORTS, SUBSYSTEMS, SOVEREIGNTY) with sensitive operational modes (VISION, RECORDER, FILES, TELEGRAM, WHATSAPP, WIRELESS, HACKING, CODE_EDITOR, INGESTION, AUTONOMY, SKILLS).",
    "It uses Electron IPC for app-state sync (sync-app-state), voice amplitude (widget-voice-data), and remote control (visual-core-remote-control).",
    "The remote command BROWSER_NAVIGATE can switch VisualCore to BROWSER mode and set the URL.",
    "Browser mode currently renders LucaBrowser in EMBEDDED mode, not governed LucaBrowser mode.",
    "Some labels still say Ghost (e.g. GHOST_BROWSER_OVERLAY, Ghost tab, Ghost Mirror) and should later become Luca Browser / Luca Screen.",
    "Mode switching is driven by props (browserUrl/visualData/cinemaUrl/videoStream) and by IPC, with no per-mode approval or audit record today.",
  ];
}

/** Governance gaps to be closed by future PRs. */
export function getVisualCoreGovernanceGaps(): string[] {
  const unsafe = getVisualCoreUnsafeOrSensitiveModes();
  return [
    "IPC remote control: visual-core-remote-control (incl. BROWSER_NAVIGATE) can drive the surface with no governance, approval, or audit trail.",
    "Embedded browser mode: BROWSER renders LucaBrowser mode=\"EMBEDDED\" instead of the governed LucaBrowser adapter.",
    `Mixed sensitive modes: ${unsafe.length} high/critical surfaces share the same ungoverned router (${unsafe.join(", ")}).`,
    "Missing display session records: there is no governed session record even for low-risk display modes.",
    "No per-mode approval/audit: no mode currently requires user approval, audit logging, or a sensitive-mode gate.",
    "Legacy Ghost naming remains in user-facing labels and should be reconciled with Luca Browser / Luca Screen.",
  ];
}

/** Conservative, ordered next steps. */
export function getVisualCoreRecommendedNextSteps(): string[] {
  const readyForDisplay = getVisualCoreReadyForDisplayGovernanceModes();
  return [
    "Introduce governance via session records and per-mode gates — NOT broad rewrites of VisualCore.",
    `First govern low-risk display modes only (${readyForDisplay.join(", ")}) with governed display session records.`,
    "Then gate sensitive modes behind explicit sensitive-mode approval, one dedicated policy at a time.",
    "Move BROWSER mode onto the governed LucaBrowser adapter before treating it as governed.",
    "Do NOT wrap all modes blindly; critical surfaces stay blocked until a dedicated per-mode policy exists.",
  ];
}

/** Build the full read-only architecture report. */
export function buildVisualCoreArchitectureReport(): VisualCoreArchitectureReport {
  return {
    overview:
      "VisualCore is a large visual operating surface / HUD router that mixes display-only and sensitive operational modes behind Electron IPC. This report is an audit map only — no governance is applied.",
    findings: getVisualCoreArchitectureFindings(),
    governanceGaps: getVisualCoreGovernanceGaps(),
    recommendedNextSteps: getVisualCoreRecommendedNextSteps(),
    summary: getVisualCoreArchitectureAuditSummary(),
  };
}
