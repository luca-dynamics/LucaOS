import { describe, expect, it } from "vitest";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import { discoverSkills } from "./skillMarketplaceDiscovery";

function rec(
  partial: Partial<SkillRegistryRecord> &
    Pick<SkillRegistryRecord, "skillId" | "name">,
): SkillRegistryRecord {
  return {
    version: "1.0.0",
    source: "openclaw",
    manifest: { description: "test skill" },
    capabilities: ["note.write"],
    requiredPermissions: ["tool.invoke"],
    lifecycleState: "discovered",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    riskLevel: "low",
    diagnostics: {
      canAutoExecute: false,
      requiresProvenanceApproval: true,
      warnings: [],
    },
    ...partial,
  };
}

describe("discoverSkills", () => {
  const catalog = [
    rec({ skillId: "a", name: "Alpha Note", riskLevel: "low", source: "openclaw" }),
    rec({
      skillId: "b",
      name: "Beta Net",
      riskLevel: "high",
      source: "mcp",
      lifecycleState: "enabled",
      capabilities: ["http.get"],
      requiredPermissions: ["network"],
    }),
    rec({
      skillId: "c",
      name: "Gamma",
      riskLevel: "medium",
      source: "claude_tools",
      lifecycleState: "quarantined",
    }),
  ];

  it("filters by text and risk", () => {
    const r = discoverSkills(catalog, { text: "note", riskLevel: "low" });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].skillId).toBe("a");
  });

  it("filters by lifecycle and capability", () => {
    const r = discoverSkills(catalog, {
      lifecycle: "enabled",
      capability: "http",
    });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].name).toBe("Beta Net");
  });

  it("builds facets from full catalog", () => {
    const r = discoverSkills(catalog, {});
    expect(r.totalCatalog).toBe(3);
    expect(r.facets.byRisk.high).toBe(1);
    expect(r.facets.byLifecycle.quarantined).toBe(1);
  });
});
