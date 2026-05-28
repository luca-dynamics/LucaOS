import type { LucaConstraintGateResult } from "./EvolutionRun";
import type { ConstraintGateReportVerifierInput } from "./ConstraintGateReportVerifier";

const now = () => new Date().toISOString();

export function createConstraintGateResult(input: Partial<LucaConstraintGateResult> & Pick<LucaConstraintGateResult, "id" | "kind" | "passed">): LucaConstraintGateResult {
  return {
    id: input.id,
    kind: input.kind,
    passed: input.passed,
    severity: input.severity ?? "unknown",
    reason: input.reason,
    evidence: input.evidence,
    createdAt: input.createdAt ?? now(),
    metadata: input.metadata,
  };
}

export function createConstraintGateReportInput(input?: Partial<ConstraintGateReportVerifierInput>): ConstraintGateReportVerifierInput {
  return {
    results: input?.results ?? [],
    evalRequired: input?.evalRequired ?? false,
    riskLevel: input?.riskLevel ?? "unknown",
    metadata: input?.metadata,
  };
}
