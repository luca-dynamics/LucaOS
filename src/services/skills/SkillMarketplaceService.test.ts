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

  it("plans sandbox and packages sync envelope", () => {
    const registry = new SkillRegistryService(memoryStore());
    const market = new SkillMarketplaceService(registry);
    market.importLoose({
      skills: [
        {
          name: "Net",
          description: "network helper",
          version: "0.1.0",
          tools: ["http.get"],
          permissions: ["network"],
        },
      ],
    });
    const skillId = market.listCatalog()[0].skillId;
    const plan = market.planSandbox(skillId);
    expect(plan).toBeTruthy();
    expect(plan!.executionEnabled).toBe(false);
    expect(plan!.requiredPermissions.length).toBeGreaterThan(0);

    const envelope = market.packageSyncEnvelope({ fromDeviceId: "t" });
    expect(envelope.format).toBe("luca_skill_sync_v1");
    expect(envelope.catalog.skillCount).toBe(1);

    const other = new SkillMarketplaceService(
      new SkillRegistryService(memoryStore()),
    );
    const applied = other.applySyncPayload(envelope);
    expect(applied.ok).toBe(true);
    expect(other.listCatalog()).toHaveLength(1);
  });

  it("discovers and simulates invoke without executing", () => {
    const registry = new SkillRegistryService(memoryStore());
    const market = new SkillMarketplaceService(registry);
    market.importLoose({
      skills: [
        { name: "FindMe", description: "searchable", version: "1.0.0", tools: ["x"] },
        { name: "Other", description: "nope", version: "1.0.0", tools: ["y"] },
      ],
    });
    const found = market.discover({ text: "FindMe" });
    expect(found.totalMatched).toBe(1);

    const skillId = market.listCatalog().find((s) => s.name === "FindMe")!
      .skillId;
    const sim = market.simulateInvoke({ skillId, intendedTool: "x" });
    expect(sim.executed).toBe(false);
    expect(sim.simulated).toBe(true);
    expect(sim.wouldInvoke).toBe(false);
  });
});
