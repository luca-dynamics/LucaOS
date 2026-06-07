import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillRegistryFixtures } from "./skillRegistryFixtures";
import { createSkillRegistry, createSkillRegistryEntry, filterSkillRegistry, summarizeSkillRegistry } from "./skillRegistry";

describe("Personal Intelligence skill registry", () => {
  it("builds UI-safe entries from fixtures", () => {
    const entries = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
    expect(entries).toHaveLength(6);
    expect(entries[0]).toMatchObject({ status: "available", executionEnabled: false, sideEffectsPerformed: false });
    expect(entries.every((entry) => entry.executionEnabled === false)).toBe(true);
  });

  it("marks medium risk for review and critical declarations as blocked", () => {
    const entries = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
    expect(entries.find((entry) => entry.skillId === "memory-proposal-helper")?.status).toBe("review_required");
    expect(entries.filter((entry) => entry.status === "blocked")).toHaveLength(2);
  });

  it.each(["network.request", "file.read", "browser.action", "lucalink.handoff"])(
    "marks high-risk %s declarations for review without enabling execution",
    (capability) => {
      const entry = createSkillRegistryEntry({
        ...personalIntelligenceSkillRegistryFixtures[0],
        id: `review-${capability}`,
        capabilities: [capability],
      });
      expect(entry.riskLevel).toBe("high");
      expect(entry.status).toBe("review_required");
      expect(entry.executionEnabled).toBe(false);
    },
  );

  it("summarizes status counts and filters without mutating entries", () => {
    const entries = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
    const before = JSON.stringify(entries);
    expect(summarizeSkillRegistry(entries)).toEqual({
      total: 6, available: 2, reviewRequired: 2, blocked: 2, disabled: 0,
      executionEnabled: false, sideEffectsPerformed: false,
    });
    expect(filterSkillRegistry(entries, { status: "blocked", riskLevel: "critical" })).toHaveLength(2);
    expect(filterSkillRegistry(entries, { query: "writing" })).toHaveLength(1);
    expect(JSON.stringify(entries)).toBe(before);
  });

  it("defensively copies manifest arrays", () => {
    const permissions = ["text.read"];
    const entry = createSkillRegistryEntry({ ...personalIntelligenceSkillRegistryFixtures[0], permissions });
    permissions.push("network.request");
    expect(entry.requiredPermissions).toEqual(["text.read"]);
  });
});
