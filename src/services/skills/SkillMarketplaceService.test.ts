import { describe, expect, it } from "vitest";
import { SkillMarketplaceService } from "./SkillMarketplaceService";
import { SkillRegistryService } from "./SkillRegistryService";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

describe("SkillMarketplaceService", () => {
  it("imports openclaw skills into registry catalog", () => {
    const registry = new SkillRegistryService(memoryStore());
    const market = new SkillMarketplaceService(registry);

    const result = market.importLoose({
      skills: [
        {
          name: "NoteTaker",
          description: "Takes notes",
          version: "1.0.0",
          tools: ["note"],
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.imported).toBe(1);
    expect(market.listCatalog()).toHaveLength(1);
    expect(market.getDiagnostics().totalSkills).toBe(1);
  });

  it("exports catalog and dry-runs without enabling execution", () => {
    const registry = new SkillRegistryService(memoryStore());
    const market = new SkillMarketplaceService(registry);
    market.importLoose({
      skills: [{ name: "X", description: "x", version: "0.1.0", tools: ["x"] }],
    });
    const skillId = market.listCatalog()[0].skillId;

    const exported = market.exportCatalog();
    expect(exported.format).toBe("luca_skill_catalog_v1");
    expect(exported.skillCount).toBe(1);

    const dry = market.dryRun(skillId);
    expect(dry).toBeTruthy();
    expect(dry!.executionEnabled).toBe(false);
    expect(dry!.useCheck.allowed).toBe(false); // discovered + no provenance
  });

  it("enable/disable/quarantine lifecycle", () => {
    const registry = new SkillRegistryService(memoryStore());
    const market = new SkillMarketplaceService(registry);
    market.importLoose({
      skills: [{ name: "Y", description: "y", version: "0.1.0" }],
    });
    const skillId = market.listCatalog()[0].skillId;

    expect(market.enable(skillId)?.lifecycleState).toBe("enabled");
    expect(market.disable(skillId)?.lifecycleState).toBe("disabled");
    expect(market.quarantine(skillId)?.lifecycleState).toBe("quarantined");
  });
});
