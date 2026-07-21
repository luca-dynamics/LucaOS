import { describe, expect, it } from "vitest";
import type {
  SkillContinuityLifecycleState,
  SkillRegistryRecord,
} from "../../types/skillContinuity";
import {
  buildSkillPermissionGrantStateFromEntries,
  buildSkillPermissionGrantStateFromLive,
} from "./skillPermissionGrantBridge";
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
    // Classifiable permission kinds so sandbox plans generate review gates.
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

describe("buildSkillPermissionGrantStateFromLive", () => {
  it("seeds gates from live registry with matching sandbox plan ids", () => {
    const liveRecords = [
      record(),
      record({
        skillId: "skill.network-fetch",
        name: "Network Fetch",
        requiredPermissions: ["network.https"],
        capabilities: ["network.https"],
        riskLevel: "high",
        manifest: {
          description: "Fetches remote content.",
          category: "network",
          permissions: ["network.https"],
        },
      }),
    ];
    const state = buildSkillPermissionGrantStateFromLive(liveRecords);
    const entries = buildSkillRegistryEntriesFromLive(liveRecords);

    expect(state.executionEnabled).toBe(false);
    expect(state.canExecute).toBe(false);
    expect(state.gates.length).toBeGreaterThan(0);

    // Every gate is scoped to a plan id that SkillRegistryPanel would generate.
    for (const entry of entries) {
      const expectedPlanId = `skill-sandbox:${entry.skillId}`;
      const skillGates = state.gates.filter(
        (gate) => gate.skillId === entry.skillId,
      );
      expect(skillGates.length).toBeGreaterThan(0);
      expect(skillGates.every((gate) => gate.planId === expectedPlanId)).toBe(
        true,
      );
    }
  });

  it("falls back to fixtures when the live registry is empty", () => {
    const state = buildSkillPermissionGrantStateFromLive([]);
    expect(state.gates.length).toBeGreaterThan(0);
    expect(state.executionEnabled).toBe(false);
  });

  it("never grants execution from live seeding", () => {
    const state = buildSkillPermissionGrantStateFromLive([
      record({ lifecycleState: "enabled" as SkillContinuityLifecycleState }),
    ]);
    expect(state.readyForExecution).toBe(false);
    expect(state.canExecute).toBe(false);
    expect(state.sideEffectsPerformed).toBe(false);
    expect(state.gates.every((gate) => !gate.canExecute)).toBe(true);
  });
});

describe("buildSkillPermissionGrantStateFromEntries", () => {
  it("builds a grant state for explicit entries", () => {
    const entries = buildSkillRegistryEntriesFromLive([record()]);
    const state = buildSkillPermissionGrantStateFromEntries(entries);
    expect(
      state.gates.some((gate) => gate.skillId === "skill.memory-helper"),
    ).toBe(true);
  });
});
