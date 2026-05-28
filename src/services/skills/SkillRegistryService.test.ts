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

  it("blocks skills with required or pending provenance approval", () => {
    const requiredStorage = new MemoryStorage();
    const requiredProv = new ProvenanceGateService(requiredStorage).createProvenanceRecord({ sourceType: "skill", sourceId: "skill-required", approvalState: "required" });
    const requiredRegistry = new SkillRegistryService(requiredStorage);
    requiredRegistry.registerSkill({ skillId: "skill-required", name: "Required", version: "1.0.0", manifest: { id: "skill-required" }, provenance: requiredProv, lifecycleState: "enabled", riskLevel: "low" });
    expect(requiredRegistry.checkWhetherSkillCanBeUsed("skill-required").blockedBy).toContain("provenance_approval_required");

    const pendingStorage = new MemoryStorage();
    const pendingProv = new ProvenanceGateService(pendingStorage).createProvenanceRecord({ sourceType: "skill", sourceId: "skill-pending", approvalState: "pending" });
    const pendingRegistry = new SkillRegistryService(pendingStorage);
    pendingRegistry.registerSkill({ skillId: "skill-pending", name: "Pending", version: "1.0.0", manifest: { id: "skill-pending" }, provenance: pendingProv, lifecycleState: "enabled", riskLevel: "low" });
    expect(pendingRegistry.checkWhetherSkillCanBeUsed("skill-pending").blockedBy).toContain("provenance_approval_required");
  });

  it("blocks quarantined skills and skills missing provenance", () => {
    const registry = new SkillRegistryService(new MemoryStorage());
    registry.registerSkill({ skillId: "skill-1", name: "Planner", version: "1.0.0", manifest: { id: "skill-1" }, lifecycleState: "enabled", riskLevel: "low" });
    expect(registry.checkWhetherSkillCanBeUsed("skill-1").blockedBy).toContain("missing_provenance");
    registry.quarantineSkill("skill-1");
    expect(registry.checkWhetherSkillCanBeUsed("skill-1").blockedBy).toContain("quarantined");
  });
});
