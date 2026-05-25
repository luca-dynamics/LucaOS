import { describe, expect, it } from "vitest";
import { LucaGuard } from "./LucaGuard";
import { GuardPolicyContext } from "./types";

describe("LucaGuard scaffold", () => {
  it("safe action allowed", () => {
    const guard = new LucaGuard();
    const ctx: GuardPolicyContext = {
      actionType: "filesystem",
      riskLevel: "safe",
      trustTier: "trusted",
      executionContext: "direct_host",
      mode: "Tactical",
    };
    const decision = guard.evaluatePolicy(ctx);
    expect(decision.allowed).toBe(true);
    expect(decision.requiresApproval).toBe(false);
  });

  it("dangerous action requires approval", () => {
    const guard = new LucaGuard();
    const decision = guard.evaluatePolicy({
      actionType: "system_command",
      riskLevel: "dangerous",
      trustTier: "verified",
      executionContext: "direct_host",
      mode: "Tactical",
      hasExplicitApproval: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.requiresApproval).toBe(true);
  });

  it("untrusted browser/computer-use action prefers sandbox", () => {
    const guard = new LucaGuard();
    const decision = guard.evaluatePolicy({
      actionType: "browser",
      riskLevel: "sensitive",
      trustTier: "untrusted",
      executionContext: "browser",
      mode: "Tactical",
    });
    expect(decision.preferredExecutionContext).toBe("sandbox");
  });

  it("public/core mode cannot approve evolution mutation", () => {
    const guard = new LucaGuard();
    const decision = guard.evaluatePolicy({
      actionType: "evolution_mutation",
      riskLevel: "sensitive",
      trustTier: "trusted",
      executionContext: "direct_host",
      mode: "Core",
      hasExplicitApproval: true,
    });
    expect(decision.allowed).toBe(false);
  });

  it("evaluateMissionStep returns Mission Engine-compatible guard result", async () => {
    const guard = new LucaGuard();
    const mission = {
      missionId: "m1",
      intent: "test",
      status: "planned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [],
      currentStepIndex: 0,
      checkpoints: [],
    } as any;
    const step = {
      stepId: "s1",
      goal: "open web",
      toolOrRuntime: "browser.navigate",
      expectedOutput: "ok",
      verification: "smoke",
      rollback: "close",
      riskLevel: "sensitive",
    } as any;

    const missionDecision = await guard.evaluateMissionStep(mission, step);
    const guardHookResult = await guard.evaluateStepRisk(mission, step);

    expect(typeof missionDecision.allowed).toBe("boolean");
    expect(typeof guardHookResult.allowed).toBe("boolean");
    expect(typeof guardHookResult.requiresApproval).toBe("boolean");
  });
});
