// VisualCoreDisplayGovernance — PR #141: VisualCore Governed Display Session
// Records.
//
// Pure helpers that decide whether a VisualCore mode is eligible for
// display-only governance, based ENTIRELY on the PR #140 audit policy.
//
// Hard guarantees:
//   - Only modes whose PR #140 readiness is `ready_for_display_governance`
//     are eligible. Sensitive modes are never eligible here.
//   - These helpers NEVER change VisualCore behavior, IPC, or browser mode,
//     and NEVER enable capture / automation / external action / file / etc.

import { getVisualCoreSurfacePolicy } from "./VisualCoreGovernancePolicy";
import type { VisualCoreSurfaceMode } from "../../types/visualCoreGovernance";

/**
 * True only for modes PR #140 classified as ready for display governance
 * (IDLE, DATA, DATA_ROOM, REPORTS, SUBSYSTEMS, SOVEREIGNTY).
 */
export function isVisualCoreModeReadyForDisplayGovernance(
  mode: VisualCoreSurfaceMode,
): boolean {
  const policy = getVisualCoreSurfacePolicy(mode);
  return (
    policy?.readiness === "ready_for_display_governance" && policy.sensitive === false
  );
}

/**
 * Whether VisualCore should record a (non-blocked) governed display session
 * for this mode. Same condition as readiness — sensitive modes return false.
 */
export function shouldRecordVisualCoreDisplaySession(
  mode: VisualCoreSurfaceMode,
): boolean {
  return isVisualCoreModeReadyForDisplayGovernance(mode);
}

/**
 * A user-safe reason string explaining the display-governance decision for a
 * mode. Never leaks sensitive detail.
 */
export function getVisualCoreDisplaySessionReason(
  mode: VisualCoreSurfaceMode,
): string {
  const policy = getVisualCoreSurfacePolicy(mode);
  if (!policy) {
    return `${mode}: unknown VisualCore mode — display governance not recorded.`;
  }
  if (isVisualCoreModeReadyForDisplayGovernance(mode)) {
    return `${policy.label}: low-risk display surface — recorded as a display-only governed session (no capture, automation, or external action).`;
  }
  return `${policy.label}: not eligible for display governance (${policy.readiness}). Sensitive modes require a dedicated policy before governance.`;
}

/** Fixed boundary labels describing what display governance does NOT allow. */
export function getVisualCoreDisplayGovernanceBoundaryLabels(): string[] {
  return [
    "Display session only",
    "No capture",
    "No automation",
    "No external action",
    "No file access",
    "No messaging",
    "No wireless/device control",
    "No wallet/payment",
    "Sensitive modes require dedicated policy",
  ];
}
