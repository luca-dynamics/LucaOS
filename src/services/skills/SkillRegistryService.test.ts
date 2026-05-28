import { describe, expect, it } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { SkillRegistryService } from "./SkillRegistryService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

describe("SkillRegistryService", () => {
  it("registers, lists, enables, and disables skills", () => {
    const storage = new MemoryStorage();
    const provenance = new ProvenanceGateService(storage).createProvenanceRecord({ sourceType: "skill", sourceId: "skill-1" });
    const registry = new SkillRegistryService(storage);
    const skill = registry.registerSkill({ skillId: "skill-1", name: "Planner", version: "1.0.0", manifest: { id: "skill-1" }, provenance, lifecycleState: "installed", riskLevel: "low" });
    expect(registry.listSkills()).toHaveLength(1);
    expect(registry.enableSkill(skill.skillId)?.lifecycleState).toBe("enabled");
    expect(registry.disableSkill(skill.skillId)?.lifecycleState).toBe("disabled");
  });

  it("blocks quarantined skills and skills missing provenance", () => {
    const registry = new SkillRegistryService(new MemoryStorage());
    registry.registerSkill({ skillId: "skill-1", name: "Planner", version: "1.0.0", manifest: { id: "skill-1" }, lifecycleState: "enabled", riskLevel: "low" });
    expect(registry.checkWhetherSkillCanBeUsed("skill-1").blockedBy).toContain("missing_provenance");
    registry.quarantineSkill("skill-1");
    expect(registry.checkWhetherSkillCanBeUsed("skill-1").blockedBy).toContain("quarantined");
  });
});
