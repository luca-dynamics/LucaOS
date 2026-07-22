import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ensureSkillMarketplaceProductBridge,
  getSkillMarketplaceBridgeStatus,
  resetSkillMarketplaceProductBridgeForTests,
} from "./skillMarketplaceProductBridge";
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

describe("skillMarketplaceProductBridge", () => {
  beforeEach(() => {
    resetSkillMarketplaceProductBridgeForTests();
  });

  it("installs hooks when bus is provided", async () => {
    const market = new SkillMarketplaceService(
      new SkillRegistryService(memoryStore()),
    );
    const bus = {
      on: vi.fn(),
      off: vi.fn(),
    };
    const result = await ensureSkillMarketplaceProductBridge({
      bus,
      lucaLink: null,
      marketplace: market,
    });
    expect(result.installed).toBe(true);
    expect(bus.on).toHaveBeenCalled();
    expect(getSkillMarketplaceBridgeStatus().installed).toBe(true);

    // idempotent
    const again = await ensureSkillMarketplaceProductBridge({
      bus,
      lucaLink: null,
      marketplace: market,
    });
    expect(again.installed).toBe(true);
  });
});
