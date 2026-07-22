import { describe, expect, it } from "vitest";
import { verifyBeforeStep } from "./preStepVerificationGate";

const safeUnit = {
  step_id: "s-safe",
  goal: "read memory note",
  tool_or_runtime: "memory",
  expected_output: "note text",
  verification: "memory contains note",
  rollback: "n/a",
  risk_level: "safe" as const,
};

const dangerousUnit = {
  step_id: "s-danger",
  goal: "delete folder",
  tool_or_runtime: "filesystem",
  expected_output: "folder gone",
  verification: "path missing",
  rollback: "restore from backup",
  risk_level: "dangerous" as const,
};

describe("preStepVerificationGate", () => {
  it("allows valid low-risk atomic units", () => {
    const result = verifyBeforeStep({ unit: safeUnit });
    expect(result.allowed).toBe(true);
    expect(result.unit?.step_id).toBe("s-safe");
  });

  it("blocks invalid contracts", () => {
    const result = verifyBeforeStep({ unit: { goal: "x" } });
    expect(result.allowed).toBe(false);
    expect(result.contractIssues.length).toBeGreaterThan(0);
  });

  it("evaluates high-risk steps with receipt pressure", () => {
    const result = verifyBeforeStep({
      unit: dangerousUnit,
      context: {
        intentClear: true,
        permissionGranted: true,
        capabilityAvailable: true,
        rollbackAvailable: true,
        receiptAvailable: false,
      },
    });
    // High-risk without receipt typically blocks or requires confirmation.
    expect(result.gateSnapshot.results.length).toBeGreaterThan(0);
    expect(result.unit?.risk_level).toBe("dangerous");
  });
});
