import { describe, expect, it } from "vitest";
import {
  appendRuntimeTraceStage,
  createPersonalIntelligenceRuntimeTrace,
  createTraceFromMemoryApprovalDryRun,
  summarizeRuntimeTrace,
} from "./runtimeTraceRecorder";
import { PERSONAL_INTELLIGENCE_DOCTRINE_STAGES } from "./runtimeTraceTypes";

const now = () => new Date("2026-06-07T12:00:00.000Z");

function createTrace() {
  return createPersonalIntelligenceRuntimeTrace({
    traceId: "trace:test",
    title: "Test evidence trace",
    source: "unit-test",
    privacyZone: "project",
    now,
  });
}

describe("runtimeTraceRecorder", () => {
  it("creates all doctrine stages in canonical order with no side effects", () => {
    const trace = createTrace();
    expect(trace.stages.map((stage) => stage.stage)).toEqual(PERSONAL_INTELLIGENCE_DOCTRINE_STAGES);
    expect(trace.stages.every((stage) => stage.status === "pending")).toBe(true);
    expect(trace.sideEffectsPerformed).toBe(false);
    expect(trace.stages.every((stage) => stage.sideEffectsPerformed === false)).toBe(true);
  });

  it("appends stage evidence purely and defensively", () => {
    const original = createTrace();
    const next = appendRuntimeTraceStage(original, {
      stage: "sense",
      status: "completed",
      summary: "Observed a bounded result summary.",
      timestamp: now().toISOString(),
    });

    expect(original.stages[0].status).toBe("pending");
    expect(next.stages[0].status).toBe("completed");
    next.warnings.push("mutated copy");
    expect(original.warnings).toEqual([]);
    expect(next.sideEffectsPerformed).toBe(false);
  });

  it("does not let an act stage imply execution without approval and external evidence", () => {
    let trace = createTrace();
    for (const stage of ["sense", "understand", "plan", "approve"] as const) {
      trace = appendRuntimeTraceStage(trace, {
        stage,
        status: "completed",
        summary: `${stage} evidence recorded.`,
        requiresApproval: stage === "approve",
        approvalSatisfied: false,
        timestamp: now().toISOString(),
      });
    }
    const next = appendRuntimeTraceStage(trace, {
      stage: "act",
      status: "completed",
      summary: "Action completed.",
      requiresApproval: true,
      approvalSatisfied: false,
      timestamp: now().toISOString(),
    });

    expect(next.stages[4].status).toBe("blocked");
    expect(next.blockers).toContain("Act stage completion requires satisfied approval metadata and an explicitly external outcome.");
    expect(next.sideEffectsPerformed).toBe(false);
  });

  it("records approve metadata without granting execution authority", () => {
    let trace = createTrace();
    for (const stage of ["sense", "understand", "plan"] as const) {
      trace = appendRuntimeTraceStage(trace, { stage, status: "completed", summary: `${stage} recorded.`, timestamp: now().toISOString() });
    }
    trace = appendRuntimeTraceStage(trace, {
      stage: "approve",
      status: "completed",
      summary: "Approval metadata observed.",
      requiresApproval: true,
      approvalSatisfied: true,
      timestamp: now().toISOString(),
    });
    expect(trace.stages[3].approvalSatisfied).toBe(true);
    expect(trace.stages[4].status).toBe("pending");
    expect(trace.sideEffectsPerformed).toBe(false);
  });

  it("converts a dry-run result into verified evidence without persisting", () => {
    const trace = createTraceFromMemoryApprovalDryRun(
      { dryRun: true, status: "dry_run", proposalId: "proposal:test", blockers: [], warnings: [], sideEffectsPerformed: false },
      { traceId: "trace:dry-run", source: "unit-test", privacyZone: "project", relatedApprovalId: "approval:test", now },
    );
    expect(trace.status).toBe("verified");
    expect(trace.stages[4].status).toBe("skipped");
    expect(trace.sideEffectsPerformed).toBe(false);
    expect(summarizeRuntimeTrace(trace)).toContain("side effects performed: false");
  });
});
