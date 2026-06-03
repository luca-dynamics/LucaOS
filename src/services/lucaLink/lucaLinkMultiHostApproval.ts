/**
 * LucaLink Multi-Host Approval Surface (PR #202)
 *
 * Pure, side-effect-free model helpers for host-aware approval eligibility.
 * This module opens no sockets, performs no storage/network/browser prompts,
 * and never executes generated code, payment, or physical actions.
 */

import type { LucaLinkApprovalRequest } from "./lucaLinkApprovalQueue";
import type { LucaLinkHostConnectionRecord } from "./lucaLinkHostConnectionModel";

export type LucaLinkApprovalSurfaceKind =
  | "primary-host-console"
  | "trusted-companion"
  | "watch-quick-action"
  | "display-only"
  | "public-display"
  | "guest-surface"
  | "sensor-surface"
  | "embodied-surface"
  | "execution-host-surface"
  | "unknown-surface";

export type LucaLinkApprovalSurfaceAuthority =
  | "none"
  | "display-only"
  | "deny-only"
  | "low-risk-approve"
  | "low-medium-risk-approve"
  | "high-risk-escalate"
  | "primary-host-only";

export type LucaLinkApprovalSurfaceDecision =
  | "can-display"
  | "can-deny"
  | "can-approve-low"
  | "can-approve-low-medium"
  | "must-escalate-primary-host"
  | "primary-host-only"
  | "blocked"
  | "invalid";

export interface LucaLinkApprovalSurfaceRecord {
  id: string;
  hostId: string;
  deviceId?: string;
  displayName: string;
  hostClass: string;
  connectionClass: string;
  presenceCapability: string;
  approvalCapability: string;
  trustLevel?: string;
  status?: string;
  surfaceKind: LucaLinkApprovalSurfaceKind;
  authority: LucaLinkApprovalSurfaceAuthority;
  canDisplayApprovals: boolean;
  canDenyApprovals: boolean;
  canApproveLowRisk: boolean;
  canApproveMediumRisk: boolean;
  canApproveHighRisk: boolean;
  canApproveCriticalRisk: boolean;
  requiresPrimaryHostEscalation: boolean;
  publicSurface: boolean;
  userPresenceRequired: boolean;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkApprovalSurfaceEvaluation {
  surfaceId: string;
  requestId?: string;
  decision: LucaLinkApprovalSurfaceDecision;
  eligible: boolean;
  requiresFreshPrimaryHostConfirmation: boolean;
  reason: string;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkApprovalSurfaceSummary {
  total: number;
  eligibleApprovalSurfaces: number;
  displayOnlySurfaces: number;
  denyOnlySurfaces: number;
  lowRiskApprovalSurfaces: number;
  lowMediumRiskApprovalSurfaces: number;
  primaryHostOnlySurfaces: number;
  blockedSurfaces: number;
  publicSurfaces: number;
  warnings: string[];
  errors: string[];
}

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function requestText(request?: Partial<LucaLinkApprovalRequest>): string {
  return JSON.stringify(request ?? {}).toLowerCase();
}

function riskRank(risk?: string): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[normalize(risk)] ?? 1;
}

function isTrusted(trust?: string): boolean {
  return ["trusted", "admin", "owner"].includes(normalize(trust));
}

function isBlockedStatus(status?: string): boolean {
  return ["blocked", "revoked", "denied", "disabled"].includes(
    normalize(status),
  );
}

function needsFreshPrimaryHost(
  request?: Partial<LucaLinkApprovalRequest>,
): boolean {
  const text = requestText(request);
  return (
    riskRank(request?.risk) >= 3 ||
    includesAny(text, [
      "payment",
      "physical",
      "safety-critical",
      "critical safety",
      "robotics motion",
      "motion-execute",
      "smart-home control",
      "actuator",
      "device-control",
    ])
  );
}

function deriveKind(
  host: LucaLinkHostConnectionRecord,
): LucaLinkApprovalSurfaceKind {
  const publicSurface =
    host.presenceCapability === "public-surface" ||
    host.connectionEvidence.join(" ").toLowerCase().includes("public");
  if (publicSurface) return "public-display";
  switch (host.hostClass) {
    case "primary-host":
      return "primary-host-console";
    case "companion-host":
      return "trusted-companion";
    case "watch-host":
      return "watch-quick-action";
    case "display-host":
    case "tv-host":
    case "web-display-host":
      return "display-only";
    case "guest-host":
      return "guest-surface";
    case "sensor-host":
    case "electronics-host":
      return "sensor-surface";
    case "embodied-host":
      return "embodied-surface";
    case "execution-host":
      return "execution-host-surface";
    default:
      return "unknown-surface";
  }
}

export function deriveLucaLinkApprovalSurface(
  hostConnection: LucaLinkHostConnectionRecord,
  options: { currentPrimaryHostId?: string } = {},
): LucaLinkApprovalSurfaceRecord {
  const kind = deriveKind(hostConnection);
  const trusted = isTrusted(hostConnection.trustLevel);
  const strongPresence =
    hostConnection.presenceCapability === "user-present-strong";
  const publicSurface =
    kind === "public-display" ||
    hostConnection.presenceCapability === "public-surface";
  const blocked = isBlockedStatus(hostConnection.status);
  const warnings = [...hostConnection.warnings];
  const errors = [...hostConnection.errors];
  let authority: LucaLinkApprovalSurfaceAuthority = "none";

  if (blocked) {
    authority = "none";
    errors.push(
      "Revoked or blocked hosts cannot display or approve approvals.",
    );
  } else if (
    kind === "primary-host-console" &&
    hostConnection.trustLevel === "owner"
  ) {
    authority = "primary-host-only";
  } else if (kind === "trusted-companion" && trusted && strongPresence) {
    authority = "low-medium-risk-approve";
  } else if (kind === "watch-quick-action" && trusted && strongPresence) {
    authority =
      hostConnection.approvalCapability === "low-medium-risk"
        ? "low-medium-risk-approve"
        : "low-risk-approve";
  } else if (kind === "execution-host-surface") {
    authority =
      options.currentPrimaryHostId === hostConnection.id ||
      hostConnection.deviceRole === "primary-host"
        ? "primary-host-only"
        : "high-risk-escalate";
    warnings.push(
      "Execution hosts cannot self-approve high-risk execution unless they are the current Primary Host.",
    );
  } else if (kind === "display-only" || kind === "public-display") {
    authority = publicSurface ? "none" : "display-only";
  } else if (
    kind === "guest-surface" ||
    kind === "sensor-surface" ||
    kind === "embodied-surface" ||
    kind === "unknown-surface"
  ) {
    authority = "none";
  }

  const canDisplay =
    !blocked &&
    !publicSurface &&
    [
      "display-only",
      "deny-only",
      "low-risk-approve",
      "low-medium-risk-approve",
      "high-risk-escalate",
      "primary-host-only",
    ].includes(authority);
  return {
    id: `approval-surface-${hostConnection.id}`,
    hostId: hostConnection.id,
    deviceId: hostConnection.deviceId,
    displayName: hostConnection.displayName,
    hostClass: hostConnection.hostClass,
    connectionClass: hostConnection.connectionClass,
    presenceCapability: hostConnection.presenceCapability,
    approvalCapability: hostConnection.approvalCapability,
    trustLevel: hostConnection.trustLevel,
    status: hostConnection.status,
    surfaceKind: kind,
    authority,
    canDisplayApprovals: canDisplay,
    canDenyApprovals: canDisplay && authority !== "display-only",
    canApproveLowRisk:
      authority === "low-risk-approve" ||
      authority === "low-medium-risk-approve" ||
      authority === "primary-host-only",
    canApproveMediumRisk:
      authority === "low-medium-risk-approve" ||
      authority === "primary-host-only",
    canApproveHighRisk: authority === "primary-host-only",
    canApproveCriticalRisk: false,
    requiresPrimaryHostEscalation:
      authority === "high-risk-escalate" || authority === "primary-host-only",
    publicSurface,
    userPresenceRequired: !["display-only", "none"].includes(authority),
    warnings,
    errors,
  };
}

export function evaluateLucaLinkApprovalSurfaceForRequest(
  surface: LucaLinkApprovalSurfaceRecord,
  approvalRequest?: Partial<LucaLinkApprovalRequest>,
): LucaLinkApprovalSurfaceEvaluation {
  if (!surface || !surface.id)
    return {
      surfaceId: "unknown",
      decision: "invalid",
      eligible: false,
      requiresFreshPrimaryHostConfirmation: false,
      reason: "Invalid approval surface.",
      warnings: [],
      errors: ["Invalid approval surface."],
    };
  if (surface.errors.length || surface.authority === "none")
    return {
      surfaceId: surface.id,
      requestId: approvalRequest?.id,
      decision: "blocked",
      eligible: false,
      requiresFreshPrimaryHostConfirmation: false,
      reason: "Surface cannot display or approve approvals.",
      warnings: surface.warnings,
      errors: surface.errors,
    };
  const fresh = needsFreshPrimaryHost(approvalRequest);
  if (fresh) {
    const primary =
      surface.surfaceKind === "primary-host-console" &&
      surface.trustLevel === "owner";
    return {
      surfaceId: surface.id,
      requestId: approvalRequest?.id,
      decision: primary ? "primary-host-only" : "must-escalate-primary-host",
      eligible: primary,
      requiresFreshPrimaryHostConfirmation: true,
      reason:
        "Physical, payment, robotics, smart-home, and safety actions require fresh Primary Host confirmation.",
      warnings: surface.warnings,
      errors: surface.errors,
    };
  }
  const rank = riskRank(approvalRequest?.risk);
  if (rank <= 0 && surface.canApproveLowRisk)
    return {
      surfaceId: surface.id,
      requestId: approvalRequest?.id,
      decision: "can-approve-low",
      eligible: true,
      requiresFreshPrimaryHostConfirmation: false,
      reason: "Surface can approve low-risk model requests.",
      warnings: surface.warnings,
      errors: surface.errors,
    };
  if (rank <= 1 && surface.canApproveMediumRisk)
    return {
      surfaceId: surface.id,
      requestId: approvalRequest?.id,
      decision: "can-approve-low-medium",
      eligible: true,
      requiresFreshPrimaryHostConfirmation: false,
      reason: "Surface can approve low/medium-risk model requests.",
      warnings: surface.warnings,
      errors: surface.errors,
    };
  if (rank <= 2 && surface.canApproveHighRisk)
    return {
      surfaceId: surface.id,
      requestId: approvalRequest?.id,
      decision: "primary-host-only",
      eligible: true,
      requiresFreshPrimaryHostConfirmation: false,
      reason:
        "Primary Host owner can approve normal high-risk software approvals; runtime enforcement still applies.",
      warnings: surface.warnings,
      errors: surface.errors,
    };
  if (surface.canDisplayApprovals)
    return {
      surfaceId: surface.id,
      requestId: approvalRequest?.id,
      decision: "must-escalate-primary-host",
      eligible: false,
      requiresFreshPrimaryHostConfirmation: false,
      reason:
        "Surface may display but must escalate this request to the Primary Host.",
      warnings: surface.warnings,
      errors: surface.errors,
    };
  return {
    surfaceId: surface.id,
    requestId: approvalRequest?.id,
    decision: "blocked",
    eligible: false,
    requiresFreshPrimaryHostConfirmation: false,
    reason: "Surface is blocked for this request.",
    warnings: surface.warnings,
    errors: surface.errors,
  };
}

export function rankEligibleApprovalSurfaces(
  surfaces: LucaLinkApprovalSurfaceRecord[],
  approvalRequest?: Partial<LucaLinkApprovalRequest>,
): LucaLinkApprovalSurfaceRecord[] {
  const score = (surface: LucaLinkApprovalSurfaceRecord): number => {
    const evaluation = evaluateLucaLinkApprovalSurfaceForRequest(
      surface,
      approvalRequest,
    );
    if (
      !evaluation.eligible &&
      evaluation.decision !== "must-escalate-primary-host"
    )
      return -1;
    return (
      (
        {
          "primary-host-console": 100,
          "trusted-companion": 70,
          "watch-quick-action": 55,
          "execution-host-surface": 45,
          "display-only": 20,
          "public-display": 5,
          "guest-surface": 0,
          "sensor-surface": 0,
          "embodied-surface": 0,
          "unknown-surface": 0,
        } as Record<LucaLinkApprovalSurfaceKind, number>
      )[surface.surfaceKind] + (evaluation.eligible ? 10 : 0)
    );
  };
  return [...surfaces]
    .filter((surface) => score(surface) >= 0)
    .sort((a, b) => score(b) - score(a));
}

export function summarizeLucaLinkApprovalSurfaces(
  surfaces: LucaLinkApprovalSurfaceRecord[],
): LucaLinkApprovalSurfaceSummary {
  return {
    total: surfaces.length,
    eligibleApprovalSurfaces: surfaces.filter(
      (s) =>
        s.canApproveLowRisk || s.canApproveMediumRisk || s.canApproveHighRisk,
    ).length,
    displayOnlySurfaces: surfaces.filter((s) => s.authority === "display-only")
      .length,
    denyOnlySurfaces: surfaces.filter((s) => s.authority === "deny-only")
      .length,
    lowRiskApprovalSurfaces: surfaces.filter((s) => s.canApproveLowRisk).length,
    lowMediumRiskApprovalSurfaces: surfaces.filter(
      (s) => s.canApproveMediumRisk,
    ).length,
    primaryHostOnlySurfaces: surfaces.filter(
      (s) => s.authority === "primary-host-only",
    ).length,
    blockedSurfaces: surfaces.filter(
      (s) => s.authority === "none" || s.errors.length,
    ).length,
    publicSurfaces: surfaces.filter((s) => s.publicSurface).length,
    warnings: surfaces.flatMap((s) => s.warnings),
    errors: surfaces.flatMap((s) => s.errors),
  };
}
