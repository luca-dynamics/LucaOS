import type { LucaUserTier } from "../../types/lucaUserTier";
import {
  getExecutionPermissionMode,
  getExecutionRiskLevel,
  LUCA_DETERMINISTIC_EXECUTION_RUNTIME_POSTURE,
  type LucaExecutionPermissionMode,
  type LucaExecutionPlan,
  type LucaExecutionRiskLevel,
  type LucaExecutionStep,
  type LucaExecutionVerificationStatus,
} from "./LucaDeterministicExecution";

export type LucaExecutionVerificationGateKind =
  | "intent_clarity"
  | "permission"
  | "risk"
  | "capability"
  | "rollback"
  | "receipt"
  | "privacy"
  | "tier"
  | "runtime_policy"
  | "unknown";

export interface LucaExecutionVerificationGateResult {
  gate: LucaExecutionVerificationGateKind;
  ok: boolean;
  status: LucaExecutionVerificationStatus;
  severity: LucaExecutionRiskLevel;
  reason?: string;
  blockedBy?: LucaExecutionVerificationGateKind | string;
  requiresUserConfirmation?: boolean;
  requiresOriginReview?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LucaExecutionVerificationContext {
  actorTier?: LucaUserTier;
  intentClear?: boolean;
  permissionGranted?: boolean;
  userConfirmationProvided?: boolean;
  originReviewProvided?: boolean;
  rollbackAvailable?: boolean;
  receiptAvailable?: boolean;
  receiptRequired?: boolean;
  privacySensitive?: boolean;
  capabilityAvailable?: boolean;
  promotionAllowed?: false;
  liveExecutionAllowed?: false;
  metadata?: Record<string, unknown>;
}

export interface LucaExecutionVerificationSummary {
  ok: boolean;
  status: LucaExecutionVerificationStatus;
  blocked: boolean;
  warnings: number;
  failures: number;
  requiresUserConfirmation: boolean;
  requiresOriginReview: boolean;
  promotionAllowed: false;
  liveExecutionAllowed: false;
  runtimeBehaviorChanged: false;
}

export interface LucaExecutionVerificationGateSnapshot {
  results: LucaExecutionVerificationGateResult[];
  summary: LucaExecutionVerificationSummary;
  runtimeBehaviorChanged: false;
  promotionAllowed: false;
  liveExecutionAllowed: false;
  persistenceEnabled: false;
  networkCallsEnabled: false;
}

const HIGH_RISK_KINDS = ["computer_use", "filesystem", "network", "self_evolution"];

function gateResult(input: LucaExecutionVerificationGateResult): LucaExecutionVerificationGateResult {
  return input;
}

function isMediumOrHigher(riskLevel: LucaExecutionRiskLevel): boolean {
  return riskLevel === "medium" || riskLevel === "high" || riskLevel === "critical";
}

function isHighOrCritical(riskLevel: LucaExecutionRiskLevel): boolean {
  return riskLevel === "high" || riskLevel === "critical";
}

function permissionNeedsConfirmation(permissionMode: LucaExecutionPermissionMode): boolean {
  return permissionMode === "confirm_required" || permissionMode === "origin_required";
}

function targetKinds(target: LucaExecutionPlan | LucaExecutionStep): string[] {
  if ("steps" in target) return target.steps.map((step) => step.kind);
  return [target.kind];
}

export function verifyExecutionStep(
  step: LucaExecutionStep,
  context: LucaExecutionVerificationContext = {},
): LucaExecutionVerificationGateResult[] {
  return verifyTarget(step, context);
}

export function verifyExecutionPlan(
  plan: LucaExecutionPlan,
  context: LucaExecutionVerificationContext = {},
): LucaExecutionVerificationGateResult[] {
  return verifyTarget(plan, context);
}

function verifyTarget(
  target: LucaExecutionPlan | LucaExecutionStep,
  context: LucaExecutionVerificationContext,
): LucaExecutionVerificationGateResult[] {
  const riskLevel = getExecutionRiskLevel(target);
  const actorTier = context.actorTier ?? ("actorTier" in target ? target.actorTier : undefined) ?? "unknown";
  const permissionMode = getExecutionPermissionMode(target, actorTier);
  const kinds = targetKinds(target);
  const hasHighRiskKind = kinds.some((kind) => HIGH_RISK_KINDS.includes(kind));
  const requiresRollback = "steps" in target ? target.steps.some((step) => step.requiresRollback) : target.requiresRollback;
  const rollbackAvailable = context.rollbackAvailable ?? ("steps" in target ? Boolean(target.rollbackPath) || target.steps.every((step) => !step.requiresRollback || step.rollbackAvailable) : target.rollbackAvailable);
  const receiptRequired = context.receiptRequired ?? ("steps" in target ? target.receiptRequired : target.receiptRequired);
  const receiptAvailable = context.receiptAvailable ?? ("steps" in target ? target.steps.every((step) => !step.receiptRequired || step.receiptAvailable) : target.receiptAvailable);
  const privacySensitive = context.privacySensitive ?? ("steps" in target ? target.steps.some((step) => step.privacySensitive) : Boolean(target.privacySensitive));

  const results: LucaExecutionVerificationGateResult[] = [];

  if (context.intentClear === false && isMediumOrHigher(riskLevel)) {
    results.push(gateResult({
      gate: "intent_clarity",
      ok: false,
      status: "blocked",
      severity: riskLevel,
      reason: "Unclear intent blocks medium-and-higher risk deterministic execution planning.",
      blockedBy: "intent_clarity",
    }));
  } else {
    results.push(gateResult({
      gate: "intent_clarity",
      ok: true,
      status: "passed",
      severity: riskLevel,
      reason: "Intent clarity is sufficient for representation.",
    }));
  }

  if (permissionMode === "blocked") {
    results.push(gateResult({
      gate: "permission",
      ok: false,
      status: "blocked",
      severity: riskLevel,
      reason: "Permission mode blocks this action by default.",
      blockedBy: "permission",
    }));
  } else if (permissionMode === "origin_required" && actorTier !== "origin") {
    results.push(gateResult({
      gate: "permission",
      ok: false,
      status: "blocked",
      severity: riskLevel,
      reason: "Origin review is required before this action can be approved.",
      blockedBy: "permission",
      requiresOriginReview: true,
    }));
  } else if (permissionNeedsConfirmation(permissionMode) && !context.permissionGranted && !context.userConfirmationProvided && !context.originReviewProvided) {
    results.push(gateResult({
      gate: "permission",
      ok: false,
      status: "blocked",
      severity: riskLevel,
      reason: "Required permission or confirmation is missing.",
      blockedBy: "permission",
      requiresUserConfirmation: permissionMode === "confirm_required",
      requiresOriginReview: permissionMode === "origin_required",
    }));
  } else {
    results.push(gateResult({
      gate: "permission",
      ok: true,
      status: "passed",
      severity: riskLevel,
      reason: "Permission is sufficient for contract representation only.",
      requiresUserConfirmation: permissionMode === "confirm_required",
      requiresOriginReview: permissionMode === "origin_required",
    }));
  }

  results.push(gateResult({
    gate: "risk",
    ok: riskLevel !== "critical",
    status: riskLevel === "critical" ? "blocked" : "passed",
    severity: riskLevel,
    reason: riskLevel === "critical" ? "Critical actions remain blocked or Origin-review-only by default." : "Risk level is representable by the contract.",
    blockedBy: riskLevel === "critical" ? "risk" : undefined,
    requiresOriginReview: riskLevel === "critical" || riskLevel === "high",
  }));

  results.push(gateResult({
    gate: "capability",
    ok: context.capabilityAvailable ?? true,
    status: context.capabilityAvailable === false ? "blocked" : "passed",
    severity: riskLevel,
    reason: context.capabilityAvailable === false ? "Required capability is unavailable." : "Capability is declared or not required for representation.",
    blockedBy: context.capabilityAvailable === false ? "capability" : undefined,
  }));

  if (requiresRollback && isHighOrCritical(riskLevel) && !rollbackAvailable) {
    results.push(gateResult({
      gate: "rollback",
      ok: false,
      status: "blocked",
      severity: riskLevel,
      reason: "High and critical risk actions require an explicit rollback/correction path.",
      blockedBy: "rollback",
    }));
  } else {
    results.push(gateResult({
      gate: "rollback",
      ok: true,
      status: "passed",
      severity: riskLevel,
      reason: "Rollback requirement is satisfied or not required.",
    }));
  }

  if (receiptRequired && !receiptAvailable) {
    const blocks = isHighOrCritical(riskLevel);
    results.push(gateResult({
      gate: "receipt",
      ok: !blocks,
      status: blocks ? "blocked" : "warning",
      severity: riskLevel,
      reason: blocks ? "Receipt/evidence is required before high-risk action approval." : "Receipt/evidence should be attached before promotion or trust elevation.",
      blockedBy: blocks ? "receipt" : undefined,
    }));
  } else {
    results.push(gateResult({
      gate: "receipt",
      ok: true,
      status: "passed",
      severity: riskLevel,
      reason: "Receipt/evidence requirement is satisfied or not required.",
    }));
  }

  if (privacySensitive && !context.userConfirmationProvided && !context.originReviewProvided) {
    results.push(gateResult({
      gate: "privacy",
      ok: false,
      status: "blocked",
      severity: riskLevel,
      reason: "Privacy-sensitive actions require explicit confirmation.",
      blockedBy: "privacy",
      requiresUserConfirmation: true,
    }));
  } else {
    results.push(gateResult({
      gate: "privacy",
      ok: true,
      status: "passed",
      severity: riskLevel,
      reason: "Privacy gate is satisfied or not applicable.",
    }));
  }

  const tierBlocked =
    (actorTier === "normal" && riskLevel === "high" && hasHighRiskKind) ||
    (actorTier === "tactical" && riskLevel === "high" && hasHighRiskKind && !context.originReviewProvided);
  results.push(gateResult({
    gate: "tier",
    ok: !tierBlocked,
    status: tierBlocked ? "blocked" : "passed",
    severity: riskLevel,
    reason: tierBlocked
      ? actorTier === "normal"
        ? "Normal tier cannot trigger high-risk computer-use, filesystem, network, or self-evolution actions."
        : "Tactical tier may request but cannot approve high-risk execution without Origin review."
      : "Tier is sufficient for representation or Origin review context.",
    blockedBy: tierBlocked ? "tier" : undefined,
    requiresOriginReview: actorTier !== "origin" && riskLevel === "high",
  }));

  results.push(gateResult({
    gate: "runtime_policy",
    ok: true,
    status: "passed",
    severity: riskLevel,
    reason: "Runtime policy remains architecture-only; live execution and promotion are disabled.",
    metadata: {
      ...LUCA_DETERMINISTIC_EXECUTION_RUNTIME_POSTURE,
      promotionAllowed: false,
      liveExecutionAllowed: false,
      requestedPromotionAllowed: context.promotionAllowed ?? false,
      requestedLiveExecutionAllowed: context.liveExecutionAllowed ?? false,
    },
  }));

  return results;
}

export function summarizeExecutionVerification(results: LucaExecutionVerificationGateResult[]): LucaExecutionVerificationSummary {
  const blocked = results.some((result) => result.status === "blocked" || !result.ok);
  const warnings = results.filter((result) => result.status === "warning").length;
  const failures = results.filter((result) => result.status === "failed" || result.status === "blocked").length;

  return {
    ok: !blocked,
    status: blocked ? "blocked" : warnings > 0 ? "warning" : "passed",
    blocked,
    warnings,
    failures,
    requiresUserConfirmation: results.some((result) => result.requiresUserConfirmation),
    requiresOriginReview: results.some((result) => result.requiresOriginReview),
    promotionAllowed: false,
    liveExecutionAllowed: false,
    runtimeBehaviorChanged: false,
  };
}

export function getExecutionVerificationGateSnapshot(input?: {
  plan?: LucaExecutionPlan;
  step?: LucaExecutionStep;
  context?: LucaExecutionVerificationContext;
  results?: LucaExecutionVerificationGateResult[];
}): LucaExecutionVerificationGateSnapshot {
  const results = input?.results ?? (input?.plan ? verifyExecutionPlan(input.plan, input.context) : input?.step ? verifyExecutionStep(input.step, input.context) : []);

  return {
    results,
    summary: summarizeExecutionVerification(results),
    runtimeBehaviorChanged: false,
    promotionAllowed: false,
    liveExecutionAllowed: false,
    persistenceEnabled: false,
    networkCallsEnabled: false,
  };
}
