import { describe, expect, it } from "vitest";
import { evaluateSkillLifecycleGate } from "./SkillLifecycleGate";
import { LucaSkillManifest } from "./SkillManifest";

const baseManifest: LucaSkillManifest = {
  id: "skill.test",
  name: "Test Skill",
  description: "test",
  version: "1.0.0",
  lifecycleState: "active",
  ownerTier: "origin",
  allowedUserTiers: ["origin", "tactical"],
  createdAt: new Date().toISOString(),
  metadata: {
    contractKind: "luca_skill_manifest",
    autonomousSelfModificationEnabled: false,
    runtimeBehaviorChanged: false,
    migrationRequired: false,
  },
  safetyPolicy: {
    riskLevel: "high",
    requiresConfirmation: true,
    requiresOriginApproval: true,
    allowedOperationTiers: ["origin", "tactical"],
  },
  promotionPolicy: {
    promotionRequiresOrigin: true,
    promotionRequiresPassingEvals: true,
    promotionRequiresRollbackPlan: true,
    promotionSource: "manual",
  },
  rollbackPolicy: { rollbackAvailable: true },
  evalPolicy: { evalRequired: true, regressionCheckRequired: true },
};

describe("SkillLifecycleGate", () => {
  it("blocks normal tier promote/evolve/rollback", () => {
    expect(evaluateSkillLifecycleGate({ manifest: baseManifest, requestedTier: "normal", requestedAction: "promote" }).allowed).toBe(false);
    expect(evaluateSkillLifecycleGate({ manifest: baseManifest, requestedTier: "normal", requestedAction: "evolve" }).allowed).toBe(false);
  });

  it("blocks tactical promotion of high-risk/core skills", () => {
    const result = evaluateSkillLifecycleGate({ manifest: baseManifest, requestedTier: "tactical", requestedAction: "promote", evalResult: { passed: true } });
    expect(result.allowed).toBe(false);
  });

  it("allows origin promote only if eval and rollback policy pass", () => {
    const failEval = evaluateSkillLifecycleGate({ manifest: baseManifest, requestedTier: "origin", requestedAction: "promote", evalResult: { passed: false } });
    expect(failEval.allowed).toBe(false);
    const pass = evaluateSkillLifecycleGate({ manifest: baseManifest, requestedTier: "origin", requestedAction: "promote", evalResult: { passed: true } });
    expect(pass.allowed).toBe(true);
  });

  it("blocks draft/candidate/deprecated states for normal invocation", () => {
    const draft = { ...baseManifest, lifecycleState: "draft" as const };
    expect(evaluateSkillLifecycleGate({ manifest: draft, requestedTier: "normal", requestedAction: "invoke" }).allowed).toBe(false);
    const deprecated = { ...baseManifest, lifecycleState: "deprecated" as const };
    expect(evaluateSkillLifecycleGate({ manifest: deprecated, requestedTier: "tactical", requestedAction: "invoke" }).allowed).toBe(false);
  });
});
