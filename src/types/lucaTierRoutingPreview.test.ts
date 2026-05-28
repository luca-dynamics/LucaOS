import { describe, expect, it } from "vitest";
import { createTierRoutingPreview } from "./lucaTierRoutingPreview";

describe("lucaTierRoutingPreview", () => {
  it("origin can allow origin dashboard when gate conditions are met", () => {
    const preview = createTierRoutingPreview({ userTier: "origin", source: "creator_override" });
    expect(preview.originDashboardMountAllowed).toBe(true);
    expect(preview.allowedSurfaces).toContain("origin_evolution_dashboard");
  });
  it("tactical/normal/unknown block origin dashboard", () => {
    expect(createTierRoutingPreview({ userTier: "tactical", source: "settings" }).originDashboardMountAllowed).toBe(false);
    expect(createTierRoutingPreview({ userTier: "normal", source: "settings" }).blockedSurfaces).toContain("origin_evolution_dashboard");
    expect(createTierRoutingPreview({ userTier: "unknown", source: "unknown" }).blockedSurfaces).toContain("origin_controls");
  });
});
