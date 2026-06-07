import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillRegistryFixtures } from "./skillRegistryFixtures";
import { validatePersonalIntelligenceSkillManifest } from "./skillManifestValidation";

const safeManifest = personalIntelligenceSkillRegistryFixtures[0];

describe("Personal Intelligence skill manifest validation", () => {
  it("accepts a complete safe static manifest", () => {
    const result = validatePersonalIntelligenceSkillManifest(safeManifest);
    expect(result.valid).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("reports missing required fields as blockers", () => {
    const result = validatePersonalIntelligenceSkillManifest({ name: "Incomplete" });
    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual(expect.arrayContaining([
      "id", "description", "version", "category", "permissions", "capabilities",
      "entrypointRef or declarationRef",
    ]));
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it.each([
    ["hiddenPrompt", "hidden prompt material"],
    ["privateReasoning", "private reasoning material"],
    ["rawFiles", "raw files material"],
    ["credentials", "credential access"],
  ])("blocks unsafe %s declarations", (field, value) => {
    const result = validatePersonalIntelligenceSkillManifest({ ...safeManifest, [field]: value });
    expect(result.valid).toBe(false);
    expect(result.unsafeFields.length).toBeGreaterThan(0);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("warns about broad and external-access declarations", () => {
    const result = validatePersonalIntelligenceSkillManifest({
      ...safeManifest,
      permissions: ["all.resources"],
      capabilities: ["network.request", "file.read", "device.control"],
      memoryPolicy: { access: "proposal_only", read: [], write: [] },
    });
    expect(result.warnings.join(" ")).toMatch(/Broad permissions/);
    expect(result.warnings.join(" ")).toMatch(/Network, file/);
    expect(result.warnings.join(" ")).toMatch(/Memory access/);
  });
});
