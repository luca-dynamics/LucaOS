import { describe, expect, it } from "vitest";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import {
  mapRegistryRecordToSandboxEntry,
  planSkillMarketplaceSandbox,
} from "./skillMarketplaceSandbox";

function sampleRecord(
  overrides: Partial<SkillRegistryRecord> = {},
): SkillRegistryRecord {
  return {
    skillId: "skill:demo:1",
    name: "Demo",
    version: "1.0.0",
    source: "test",
    manifest: {
      id: "skill:demo:1",
      name: "Demo",
      description: "Demo skill",
      version: "1.0.0",
      lifecycleState: "candidate",
      ownerTier: "normal",
      allowedUserTiers: ["normal"],
      allowedTools: ["demo.tool"],
      deniedTools: [],
      safetyPolicy: {
        riskLevel: "medium",
        requiresConfirmation: true,
        requiresOriginApproval: false,
        allowedOperationTiers: ["normal", "tactical", "origin"],
        networkAllowed: true,
        fileSystemAllowed: false,
        computerUseAllowed: false,
        voiceExecutionAllowed: false,
      },
      evalPolicy: { evalRequired: true, regressionCheckRequired: false },
      promotionPolicy: {
        promotionRequiresOrigin: true,
        promotionRequiresPassingEvals: true,
        promotionRequiresRollbackPlan: false,
        promotionSource: "skill_ingestion",
      },
      rollbackPolicy: { rollbackAvailable: true },
      source: "test",
      createdAt: new Date().toISOString(),
      metadata: {
        contractKind: "luca_skill_manifest",
        autonomousSelfModificationEnabled: false,
        runtimeBehaviorChanged: false,
        migrationRequired: false,
      },
    },
    capabilities: ["demo.tool"],
    requiredPermissions: ["tool.invoke"],
    lifecycleState: "discovered",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    riskLevel: "medium",
    diagnostics: {
      canAutoExecute: false,
      requiresProvenanceApproval: true,
      warnings: ["needs approval"],
    },
    ...overrides,
  };
}

describe("skillMarketplaceSandbox", () => {
  it("maps registry record to sandbox entry with permissions", () => {
    const entry = mapRegistryRecordToSandboxEntry(sampleRecord());
    expect(entry.skillId).toBe("skill:demo:1");
    expect(entry.executionEnabled).toBe(false);
    expect(entry.requiredPermissions).toContain("tool.invoke");
    expect(entry.requiredPermissions).toContain("network");
    expect(entry.blockers.length).toBeGreaterThan(0);
  });

  it("builds dry-run sandbox plan without enabling execution", () => {
    const plan = planSkillMarketplaceSandbox(sampleRecord());
    expect(plan.executionEnabled).toBe(false);
    expect(plan.canExecute).toBe(false);
    expect(plan.sandboxMode).toBe("dry_run_plan");
    expect(plan.requiredPermissions.length).toBeGreaterThan(0);
    expect(plan.sideEffectsPerformed).toBe(false);
  });
});
