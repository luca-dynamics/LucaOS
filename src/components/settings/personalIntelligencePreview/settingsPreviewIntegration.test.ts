import { describe, expect, it } from "vitest";
import personalitySource from "../PersonalityDashboard.tsx?raw";
import knowledgeSource from "../KnowledgeBridgeTab.tsx?raw";
import dataSource from "../SettingsDataTab.tsx?raw";
import modelManagerSource from "../SettingsModelManagerTab.tsx?raw";
import mcpSource from "../SettingsMCPBridgeTab.tsx?raw";
import lucaLinkSource from "../SettingsLucaLinkTab.tsx?raw";
import { settingsExperienceMap } from "../settingsExperienceMap";

const expectedExistingLabels = [
  "Personality",
  "Knowledge Base",
  "Data & Memory",
  "Brain",
  "Model Manager",
  "MCP Bridge",
  "Luca Link",
];

describe("Settings Personal Intelligence preview integration", () => {
  it("integrates cards into existing Settings tabs", () => {
    expect(personalitySource).toContain("IdentityCorePreviewCard");
    expect(knowledgeSource).toContain("MemoryItemPreviewCard");
    expect(dataSource).toContain("PrivacyZonesPreviewCard");
    expect(dataSource).toContain("LearningEventPreviewCard");
    expect(modelManagerSource).toContain("preferredModelsPreview");
    expect(modelManagerSource).toContain("ExecutionDoctrinePreviewCard");
    expect(mcpSource).toContain("SkillManifestPreviewCard");
  });

  it("does not add a duplicate Personal Intelligence navigation tab", () => {
    expect(
      settingsExperienceMap.some(
        (entry) => entry.id === "personal-intelligence",
      ),
    ).toBe(false);
    const labels = settingsExperienceMap.map((entry) => entry.currentLabel);
    for (const label of expectedExistingLabels) {
      expect(labels).toContain(label);
    }
  });

  it("keeps LucaLink future-only and forbids raw private transfer", () => {
    expect(lucaLinkSource).toContain(
      "Future bounded handoff preview requires PR #212",
    );
    expect(lucaLinkSource).toContain(
      "raw memory/private reasoning transfer remains forbidden",
    );
    expect(lucaLinkSource).toContain(
      "No Personal Intelligence data is wired into LucaLink",
    );
  });
});
