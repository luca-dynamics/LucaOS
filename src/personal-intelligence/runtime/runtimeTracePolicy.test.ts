import { describe, expect, it } from "vitest";
import { appendRuntimeTraceStage, createPersonalIntelligenceRuntimeTrace } from "./runtimeTraceRecorder";
import { evaluateRuntimeTracePolicy } from "./runtimeTracePolicy";

const now = () => new Date("2026-06-07T12:00:00.000Z");

function traceWith(summary: string, privacyZone: "project" | "private" | "credential" = "project") {
  return appendRuntimeTraceStage(
    createPersonalIntelligenceRuntimeTrace({ traceId: "trace:policy", title: "Policy trace", source: "unit-test", privacyZone, now }),
    { stage: "sense", status: "completed", summary, timestamp: now().toISOString() },
  );
}

describe("runtimeTracePolicy", () => {
  it.each([
    "Captured hidden system prompt text.",
    "Captured private chain-of-thought reasoning.",
    "Attached raw user file contents.",
    "password=not-allowed",
    "Authorization evidence: Bearer abcdefghijklmnopqrstuvwxyz123456",
  ])("blocks unsafe evidence: %s", (summary) => {
    const result = evaluateRuntimeTracePolicy(traceWith(summary));
    expect(result.allowed).toBe(false);
    expect(result.trace.status).toBe("blocked");
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("rejects traces that claim side effects", () => {
    const trace = traceWith("Bounded evidence summary.") as unknown as { sideEffectsPerformed: boolean };
    trace.sideEffectsPerformed = true;
    const result = evaluateRuntimeTracePolicy(trace as never);
    expect(result.allowed).toBe(false);
    expect(result.blockers.join(" ")).toContain("cannot claim side effects");
    expect(result.trace.sideEffectsPerformed).toBe(false);
  });

  it("requires explicit approval metadata for sensitive zones", () => {
    const blocked = evaluateRuntimeTracePolicy(traceWith("Bounded credential-zone summary.", "credential"));
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockers.join(" ")).toContain("requires explicit approval metadata");

    const allowed = evaluateRuntimeTracePolicy(traceWith("Bounded approved-zone summary.", "credential"), {
      explicitApproval: true,
      approvalId: "approval:test",
    });
    expect(allowed.allowed).toBe(true);
  });

  it("requires approval or an explicit review policy for private traces", () => {
    expect(evaluateRuntimeTracePolicy(traceWith("Bounded private summary.", "private")).allowed).toBe(false);
    expect(evaluateRuntimeTracePolicy(traceWith("Bounded private summary.", "private"), { allowPrivateTraceReview: true }).allowed).toBe(true);
  });

  it("blocks act-stage execution authority claims", () => {
    let trace = createPersonalIntelligenceRuntimeTrace({ traceId: "trace:act", title: "Act trace", source: "unit-test", privacyZone: "project", now });
    for (const stage of ["sense", "understand", "plan", "approve"] as const) {
      trace = appendRuntimeTraceStage(trace, { stage, status: "completed", summary: `${stage} evidence.`, timestamp: now().toISOString() });
    }
    trace = appendRuntimeTraceStage(trace, {
      stage: "act", status: "pending", summary: "Permission to execute now was granted.", requiresApproval: true, approvalSatisfied: true, timestamp: now().toISOString(),
    });
    const result = evaluateRuntimeTracePolicy(trace, { explicitApproval: true, approvalId: "approval:test" });
    expect(result.allowed).toBe(false);
    expect(result.trace.stages[4].status).toBe("blocked");
    expect(result.trace.sideEffectsPerformed).toBe(false);
  });
});
