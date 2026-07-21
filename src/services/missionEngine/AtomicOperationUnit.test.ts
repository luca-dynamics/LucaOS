import { describe, expect, it } from "vitest";
import {
  atomicUnitToExecutionStep,
  atomicUnitToMissionStep,
  validateAtomicOperationUnit,
  validateAtomicOperationUnits,
} from "./AtomicOperationUnit";

const validUnit = {
  step_id: "s1",
  goal: "write report",
  tool_or_runtime: "filesystem",
  expected_output: "report.md exists",
  verification: "stat report.md",
  rollback: "restore prior report.md",
  risk_level: "dangerous" as const,
};

describe("AtomicOperationUnit", () => {
  it("validates complete units", () => {
    const result = validateAtomicOperationUnit(validUnit);
    expect(result.ok).toBe(true);
    expect(result.unit?.step_id).toBe("s1");
  });

  it("rejects missing fields", () => {
    const result = validateAtomicOperationUnit({ step_id: "x" });
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("projects to mission and execution steps", () => {
    const unit = validateAtomicOperationUnit(validUnit).unit!;
    const mission = atomicUnitToMissionStep(unit);
    expect(mission.stepId).toBe("s1");
    expect(mission.riskLevel).toBe("dangerous");
    const exec = atomicUnitToExecutionStep(unit);
    expect(exec.kind).toBe("filesystem");
    expect(exec.riskLevel).toBe("high");
  });

  it("validates unit lists", () => {
    const batch = validateAtomicOperationUnits([validUnit, { goal: "nope" }]);
    expect(batch.ok).toBe(false);
    expect(batch.units).toHaveLength(1);
  });
});
