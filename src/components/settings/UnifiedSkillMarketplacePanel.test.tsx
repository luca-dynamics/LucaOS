// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnifiedSkillMarketplacePanel } from "./UnifiedSkillMarketplacePanel";

const sources = import.meta.glob(["./UnifiedSkillMarketplacePanel.tsx"], {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("UnifiedSkillMarketplacePanel", () => {
  it("renders marketplace shell", () => {
    const markup = renderToStaticMarkup(<UnifiedSkillMarketplacePanel />);
    expect(markup).toContain("Skill Marketplace");
    expect(markup).toContain("Absorb Phase 3");
    expect(markup).toContain("Export catalog");
  });

  it("wires marketplace service paths", () => {
    const file = sources["./UnifiedSkillMarketplacePanel.tsx"] || "";
    expect(file).toContain("skillMarketplaceService");
    expect(file).toContain("importLoose");
    expect(file).toContain("exportCatalog");
    expect(file).toContain("dryRun");
    expect(file).toContain("planSandbox");
    expect(file).toContain("simulateInvoke");
    expect(file).toContain("discover");
    expect(file).toContain("ensureSkillMarketplaceProductBridge");
    expect(file).toContain("packageSyncEnvelope");
    expect(file).toContain("pushViaLucaLink");
    expect(file).toContain("quarantine");
  });
});
