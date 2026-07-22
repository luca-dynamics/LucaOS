import { describe, expect, it } from "vitest";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import { simulateSkillInvoke } from "./skillMarketplaceInvokeSim";

describe("simulateSkillInvoke", () => {
  it("never executes and always reports simulated", () => {
    const record: SkillRegistryRecord = {
      skillId: "s1",
      name: "S",
      version: "1",
      source: "t",
      manifest: {},
      capabilities: ["t"],
      requiredPermissions: ["tool.invoke"],
      lifecycleState: "enabled",
      createdAt: "",
      updatedAt: "",
      riskLevel: "low",
      diagnostics: {
        canAutoExecute: false,
        requiresProvenanceApproval: false,
        warnings: [],
      },
    };

    const result = simulateSkillInvoke({
      record,
      dryRun: {
        skillId: "s1",
        useCheck: { allowed: true, userSafeReason: "ok", blockedBy: [] },
        lifecycleGate: {
          allowed: true,
          lifecycleState: "active",
        },
        executionEnabled: false,
        summary: "gates open",
      },
      intendedTool: "t",
    });

    expect(result.simulated).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.wouldInvoke).toBe(false);
    expect(result.blockedBy).toContain("execution_disabled_pilot");
  });

  it("reports missing skill", () => {
    const result = simulateSkillInvoke({
      record: null,
      dryRun: null,
    });
    expect(result.blockedBy).toContain("missing_skill");
    expect(result.executed).toBe(false);
  });
});
