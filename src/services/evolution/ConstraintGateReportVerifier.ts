import type { LucaConstraintGateResult } from "./EvolutionRun";

export interface ConstraintGateReportVerifierInput {
  results: LucaConstraintGateResult[];
  evalRequired?: boolean;
  riskLevel?: "low" | "medium" | "high" | "critical" | "unknown";
  metadata?: Record<string, unknown>;
}

export interface ConstraintGateReportVerifierOutput {
  ok: boolean;
  severity: "low" | "medium" | "high" | "critical";
  blockingReasons: string[];
  warnings: string[];
  requiredOriginReview: boolean;
  promotionAllowed: false;
  metadata: Record<string, unknown>;
}

const ORIGIN_REVIEW_GATE_KINDS = new Set(["runtime_policy", "computer_use_policy", "filesystem_policy", "network_policy", "voice_policy"]);

export function summarizeConstraintGateResults(results: LucaConstraintGateResult[]) {
  const byKind = new Map<string, LucaConstraintGateResult>();
  for (const result of results) byKind.set(result.kind, result);

  return {
    total: results.length,
    passed: results.filter((item) => item.passed).length,
    failed: results.filter((item) => !item.passed).length,
    byKind,
  };
}

export function verifyConstraintGateReport(input: ConstraintGateReportVerifierInput): ConstraintGateReportVerifierOutput {
  const summary = summarizeConstraintGateResults(input.results ?? []);
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const riskLevel = input.riskLevel ?? "unknown";

  const safety = summary.byKind.get("safety");
  const regression = summary.byKind.get("regression");
  const rollback = summary.byKind.get("rollback");
  const evalGate = summary.byKind.get("eval");

  if (!safety || !safety.passed) blockingReasons.push("failed_safety_gate");
  if (!regression || !regression.passed) blockingReasons.push("failed_regression_gate");
  if (input.evalRequired && (!evalGate || !evalGate.passed)) blockingReasons.push("missing_or_failed_eval_gate");

  if (!rollback) {
    if (["medium", "high", "critical"].includes(riskLevel)) blockingReasons.push("missing_rollback_gate_for_medium_plus_risk");
    else warnings.push("missing_rollback_gate");
  } else if (!rollback.passed) {
    blockingReasons.push("failed_rollback_gate");
  }

  for (const result of input.results ?? []) {
    if (result.kind === "unknown") warnings.push("unknown_gate_kind");
    if (ORIGIN_REVIEW_GATE_KINDS.has(result.kind)) warnings.push(`origin_review_required:${result.kind}`);
  }

  const requiredOriginReview = warnings.some((item) => item.startsWith("origin_review_required:"));
  const hasCriticalOrHighFailure = (input.results ?? []).some((item) => !item.passed && (item.severity === "critical" || item.severity === "high"));
  const severity: ConstraintGateReportVerifierOutput["severity"] = blockingReasons.length
    ? hasCriticalOrHighFailure
      ? "critical"
      : "high"
    : warnings.length
      ? "medium"
      : "low";

  return {
    ok: blockingReasons.length === 0,
    severity,
    blockingReasons,
    warnings,
    requiredOriginReview,
    promotionAllowed: false,
    metadata: {
      contractKind: "luca_constraint_gate_report_verifier",
      autoPromotionEnabled: false,
      evalRequired: Boolean(input.evalRequired),
      riskLevel,
      ...input.metadata,
    },
  };
}

export function getConstraintGateReportVerifierSnapshot(input?: Record<string, unknown>) {
  return {
    contractKind: "luca_constraint_gate_report_verifier",
    autoPromotionEnabled: false,
    originReviewRequiredForPolicyGates: true,
    runtimeBehaviorChanged: false,
    ...input,
  };
}
