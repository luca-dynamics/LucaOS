import { describe, expect, it } from "vitest";
import type {
  SkillContinuityLifecycleState,
  SkillRegistryRecord,
} from "../../types/skillContinuity";
import { buildSkillRegistryEntriesFromLive } from "./skillRegistryBridge";

function record(
  overrides: Partial<SkillRegistryRecord> = {},
): SkillRegistryRecord {
  return {
    skillId: "skill.summarize",
    name: "Summarize",
    version: "1.0.0",
    source: "builtin",
    manifest: {
      description: "Summarizes text.",
      category: "productivity",
      permissions: ["read_text"],
      capabilities: ["summarize"],
    },
    capabilities: ["summarize"],
    requiredPermissions: ["read_text"],
    lifecycleState: "enabled",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    riskLevel: "low",
    diagnostics: {
      canAutoExecute: false,
      requiresProvenanceApproval: false,
      warnings: [],
    },
    ...overrides,
  };
}

describe("buildSkillRegistryEntriesFromLive", () => {
  it("returns empty for an empty live registry", () => {
    expect(buildSkillRegistryEntriesFromLive([])).toEqual([]);
  });

  it("maps a live record onto a PI entry, inspection-only", () => {
    const [entry] = buildSkillRegistryEntriesFromLive([record()]);
    expect(entry.skillId).toBe("skill.summarize");
    expect(entry.name).toBe("Summarize");
    expect(entry.description).toBe("Summarizes text.");
    expect(entry.category).toBe("productivity");
    expect(entry.requiredPermissions).toContain("read_text");
    // Surfacing a live skill never grants execution authority.
    expect(entry.executionEnabled).toBe(false);
    expect(entry.readiness.readyForExecution).toBe(false);
  });

  it("marks disabled lifecycle states as disabled", () => {
    const states: SkillContinuityLifecycleState[] = [
      "disabled",
      "deprecated",
      "removed",
    ];
    for (const lifecycleState of states) {
      const [entry] = buildSkillRegistryEntriesFromLive([
        record({ skillId: `s.${lifecycleState}`, lifecycleState }),
      ]);
      expect(entry.status).toBe("disabled");
    }
  });

  it("marks a quarantined skill as blocked with a reason", () => {
    const [entry] = buildSkillRegistryEntriesFromLive([
      record({ lifecycleState: "quarantined" }),
    ]);
    expect(entry.status).toBe("blocked");
    expect(entry.blockers.join(" ")).toContain("quarantined");
  });

  it("falls back to a readable description when the manifest has none", () => {
    const [entry] = buildSkillRegistryEntriesFromLive([
      record({ manifest: {}, name: "Bare", source: "installed" }),
    ]);
    expect(entry.description).toContain("Bare");
    expect(entry.description).toContain("installed");
  });
});
