import { describe, expect, it, vi } from "vitest";
import { SkillMarketplaceService } from "./SkillMarketplaceService";
import { SkillRegistryService } from "./SkillRegistryService";
import {
  applySkillCatalogSyncPayload,
  installSkillCatalogSyncHooks,
  LUCA_SKILL_SYNC_ENVELOPE,
  packageSkillCatalogForSync,
  pushSkillCatalogViaLucaLink,
  SKILL_CATALOG_SYNC_EVENT,
  summarizeCatalogDiff,
} from "./skillMarketplaceLinkSync";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

describe("skillMarketplaceLinkSync", () => {
  it("packages and applies catalog envelope", () => {
    const registry = new SkillRegistryService(memoryStore());
    const market = new SkillMarketplaceService(registry);
    market.importLoose({
      skills: [
        { name: "A", description: "a", version: "1.0.0", tools: ["a"] },
      ],
    });

    const envelope = packageSkillCatalogForSync(market, {
      fromDeviceId: "desk-1",
    });
    expect(envelope.format).toBe(LUCA_SKILL_SYNC_ENVELOPE);
    expect(envelope.catalog.skillCount).toBe(1);

    const other = new SkillMarketplaceService(
      new SkillRegistryService(memoryStore()),
    );
    const applied = applySkillCatalogSyncPayload(envelope, other);
    expect(applied.ok).toBe(true);
    expect(applied.imported).toBe(1);
    expect(other.listCatalog()).toHaveLength(1);
  });

  it("pushes via lucaLink sendEvent", () => {
    const market = new SkillMarketplaceService(
      new SkillRegistryService(memoryStore()),
    );
    const sendEvent = vi.fn();
    const result = pushSkillCatalogViaLucaLink(
      { sendEvent },
      market,
      { fromDeviceId: "x" },
    );
    expect(result.ok).toBe(true);
    expect(sendEvent).toHaveBeenCalledWith(
      "all",
      SKILL_CATALOG_SYNC_EVENT,
      expect.objectContaining({ format: LUCA_SKILL_SYNC_ENVELOPE }),
    );
  });

  it("installs hooks and applies on bus event", () => {
    const market = new SkillMarketplaceService(
      new SkillRegistryService(memoryStore()),
    );
    market.importLoose({
      skills: [{ name: "Seed", description: "s", version: "0.1.0" }],
    });
    const envelope = packageSkillCatalogForSync(market);

    const target = new SkillMarketplaceService(
      new SkillRegistryService(memoryStore()),
    );
    const busHandlers = new Map<string, Array<(...a: unknown[]) => void>>();
    const bus = {
      on: (event: string, fn: (...a: unknown[]) => void) => {
        const list = busHandlers.get(event) ?? [];
        list.push(fn);
        busHandlers.set(event, list);
      },
      off: vi.fn(),
    };

    const installed = installSkillCatalogSyncHooks({
      bus,
      marketplace: target,
    });
    expect(installed.installed).toBe(true);

    for (const fn of busHandlers.values()) {
      for (const h of fn) h(envelope);
    }
    expect(target.listCatalog().length).toBeGreaterThan(0);
    installed.dispose?.();
  });

  it("summarizes catalog diff", () => {
    const diff = summarizeCatalogDiff(
      [
        {
          skillId: "a",
          name: "A",
          version: "1",
          source: "t",
          manifest: {},
          capabilities: [],
          requiredPermissions: [],
          lifecycleState: "discovered",
          createdAt: "",
          updatedAt: "",
          riskLevel: "low",
          diagnostics: {
            canAutoExecute: false,
            requiresProvenanceApproval: false,
            warnings: [],
          },
        },
      ] as any,
      ["a", "b"],
    );
    expect(diff.shared).toBe(1);
    expect(diff.remoteOnly).toBe(1);
    expect(diff.localOnly).toBe(0);
  });
});
