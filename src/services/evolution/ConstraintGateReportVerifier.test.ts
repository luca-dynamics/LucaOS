import { describe, expect, it } from "vitest";
import { verifyConstraintGateReport } from "./ConstraintGateReportVerifier";
import { createConstraintGateReportInput, createConstraintGateResult } from "./ConstraintGateReportMapping";

describe("ConstraintGateReportVerifier", () => {
  it("failed safety blocks", () => {
    const out = verifyConstraintGateReport(
      createConstraintGateReportInput({
        results: [createConstraintGateResult({ id: "g1", kind: "safety", passed: false, severity: "high" })],
      }),
    );
    expect(out.ok).toBe(false);
    expect(out.blockingReasons).toContain("failed_safety_gate");
  });

  it("failed regression blocks", () => {
    const out = verifyConstraintGateReport(
      createConstraintGateReportInput({
        results: [createConstraintGateResult({ id: "g1", kind: "regression", passed: false, severity: "medium" })],
      }),
    );
    expect(out.ok).toBe(false);
    expect(out.blockingReasons).toContain("failed_regression_gate");
  });

  it("missing rollback blocks medium+ risk", () => {
    const out = verifyConstraintGateReport(
      createConstraintGateReportInput({
        riskLevel: "medium",
        results: [
          createConstraintGateResult({ id: "g1", kind: "safety", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g2", kind: "regression", passed: true, severity: "low" }),
        ],
      }),
    );
    expect(out.blockingReasons).toContain("missing_rollback_gate_for_medium_plus_risk");
  });

  it("missing eval blocks when required", () => {
    const out = verifyConstraintGateReport(
      createConstraintGateReportInput({
        evalRequired: true,
        results: [
          createConstraintGateResult({ id: "g1", kind: "safety", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g2", kind: "regression", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g3", kind: "rollback", passed: true, severity: "low" }),
        ],
      }),
    );
    expect(out.blockingReasons).toContain("missing_or_failed_eval_gate");
  });

  it("risky capability requires Origin", () => {
    const out = verifyConstraintGateReport(
      createConstraintGateReportInput({
        results: [
          createConstraintGateResult({ id: "g1", kind: "safety", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g2", kind: "regression", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g3", kind: "rollback", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g4", kind: "runtime_policy", passed: true, severity: "medium" }),
        ],
      }),
    );
    expect(out.requiredOriginReview).toBe(true);
  });

  it("unknown gate warns", () => {
    const out = verifyConstraintGateReport(
      createConstraintGateReportInput({
        results: [
          createConstraintGateResult({ id: "g1", kind: "safety", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g2", kind: "regression", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g3", kind: "rollback", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g4", kind: "unknown", passed: true, severity: "low" }),
        ],
      }),
    );
    expect(out.warnings).toContain("unknown_gate_kind");
  });

  it("all pass returns ok but no auto-promotion", () => {
    const out = verifyConstraintGateReport(
      createConstraintGateReportInput({
        results: [
          createConstraintGateResult({ id: "g1", kind: "safety", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g2", kind: "regression", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g3", kind: "rollback", passed: true, severity: "low" }),
          createConstraintGateResult({ id: "g4", kind: "eval", passed: true, severity: "low" }),
        ],
      }),
    );
    expect(out.ok).toBe(true);
    expect(out.promotionAllowed).toBe(false);
  });
});
