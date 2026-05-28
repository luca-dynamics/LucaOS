import { describe, expect, it } from "vitest";
import { createExecutionPlan, createExecutionStep } from "./LucaDeterministicExecution";
import { summarizeExecutionVerification, verifyExecutionPlan, verifyExecutionStep } from "./LucaExecutionVerificationGate";

describe("LucaExecutionVerificationGate", () => {
  it("blocks Normal from high-risk computer-use/filesystem/network/self-evolution actions", () => {
    const step = createExecutionStep({ kind: "filesystem", summary: "Modify project files", riskLevel: "high" });
    const results = verifyExecutionStep(step, { actorTier: "normal", intentClear: true });
    const summary = summarizeExecutionVerification(results);

    expect(summary.blocked).toBe(true);
    expect(results.some((result) => result.gate === "tier" && result.status === "blocked")).toBe(true);
  });

  it("allows Tactical to request but not approve high-risk execution", () => {
    const step = createExecutionStep({ kind: "network", summary: "Invoke production endpoint", riskLevel: "high" });
    const results = verifyExecutionStep(step, { actorTier: "tactical", intentClear: true });
    const summary = summarizeExecutionVerification(results);

    expect(summary.blocked).toBe(true);
    expect(summary.requiresOriginReview).toBe(true);
    expect(results.some((result) => result.reason?.includes("Tactical tier may request"))).toBe(true);
  });

  it("lets Origin review high-risk action while liveExecutionAllowed remains false", () => {
    const step = createExecutionStep({
      kind: "self_evolution",
      summary: "Review candidate promotion",
      riskLevel: "high",
      rollbackAvailable: true,
      receiptAvailable: true,
    });
    const results = verifyExecutionStep(step, {
      actorTier: "origin",
      intentClear: true,
      originReviewProvided: true,
      rollbackAvailable: true,
      receiptAvailable: true,
    });
    const summary = summarizeExecutionVerification(results);

    expect(summary.requiresOriginReview).toBe(true);
    expect(summary.liveExecutionAllowed).toBe(false);
    expect(summary.promotionAllowed).toBe(false);
  });

  it("blocks high and critical plans when rollback is missing", () => {
    const step = createExecutionStep({ kind: "computer_use", summary: "Operate a remote admin console", riskLevel: "high" });
    const plan = createExecutionPlan({ summary: "High-risk action", steps: [step], actorTier: "origin" });
    const results = verifyExecutionPlan(plan, { actorTier: "origin", intentClear: true, originReviewProvided: true });

    expect(results.some((result) => result.gate === "rollback" && result.status === "blocked")).toBe(true);
  });
});
