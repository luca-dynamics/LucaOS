import { describe, expect, it } from "vitest";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import {
  buildSkillDryRunSimulationForEntry,
  buildSkillDryRunSimulationsFromLive,
  summarizeSkillDryRunPipeline,
} from "./skillDryRunBridge";
import { buildSkillRegistryEntriesFromLive } from "./skillRegistryBridge";

function record(
  overrides: Partial<SkillRegistryRecord> = {},
): SkillRegistryRecord {
  return {
    skillId: "skill.memory-helper",
    name: "Memory Helper",
    version: "1.0.0",
    source: "builtin",
    manifest: {
      description: "Proposes memories for review.",
      category: "memory",
      permissions: ["memory.proposal.request"],
      capabilities: ["memory.proposal"],
      memoryPolicy: { access: "proposal_only", read: [], write: [] },
    },
    capabilities: ["memory.proposal"],
    requiredPermissions: ["memory.proposal.request"],
    lifecycleState: "enabled",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    riskLevel: "medium",
    diagnostics: {
      canAutoExecute: false,
      requiresProvenanceApproval: true,
      warnings: [],
    },
    ...overrides,
  };
}

describe("buildSkillDryRunSimulationsFromLive", () => {
  it("builds dry-runs for live registry records without execution", () => {
    const result = buildSkillDryRunSimulationsFromLive([record()]);
    expect(result.isLive).toBe(true);
    expect(result.simulations.length).toBe(1);
    const sim = result.simulations[0];
    expect(sim.dryRunOnly).toBe(true);
    expect(sim.canExecute).toBe(false);
    expect(sim.executionEnabled).toBe(false);
    expect(sim.sideEffectsPerformed).toBe(false);
    expect(sim.skillId).toBe("skill.memory-helper");
    expect(result.readiness.readyForExecution).toBe(false);
  });

  it("falls back to fixtures when live registry is empty", () => {
    const result = buildSkillDryRunSimulationsFromLive([]);
    expect(result.isLive).toBe(false);
    expect(result.simulations.length).toBeGreaterThan(0);
    expect(result.simulations.every((sim) => !sim.canExecute)).toBe(true);
  });

  it("respects limit for compact surfaces", () => {
    const records = [
      record({ skillId: "a" }),
      record({ skillId: "b" }),
      record({ skillId: "c" }),
    ];
    const result = buildSkillDryRunSimulationsFromLive(records, { limit: 2 });
    expect(result.simulations).toHaveLength(2);
  });
});

describe("buildSkillDryRunSimulationForEntry", () => {
  it("uses sandbox plan ids that match permission gate scoping", () => {
    const [entry] = buildSkillRegistryEntriesFromLive([record()]);
    const sim = buildSkillDryRunSimulationForEntry(entry, {
      permissionGates: [],
    });
    expect(sim.planId).toBe(`skill-sandbox:${entry.skillId}`);
    expect(sim.blockedActions).toContain("skill execution");
  });
});

describe("summarizeSkillDryRunPipeline", () => {
  it("never reports execution authority", () => {
    const { simulations } = buildSkillDryRunSimulationsFromLive([record()]);
    const summary = summarizeSkillDryRunPipeline(simulations);
    expect(summary.canExecute).toBe(false);
    expect(summary.executionEnabled).toBe(false);
    expect(summary.sideEffectsPerformed).toBe(false);
    expect(summary.total).toBe(simulations.length);
  });
});
