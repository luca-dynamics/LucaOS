import { describe, expect, it } from "vitest";
import personalitySource from "../PersonalityDashboard.tsx?raw";
import knowledgeSource from "../KnowledgeBridgeTab.tsx?raw";
import dataSource from "../SettingsDataTab.tsx?raw";
import modelManagerSource from "../SettingsModelManagerTab.tsx?raw";
import mcpSource from "../SettingsMCPBridgeTab.tsx?raw";
import lucaLinkSource from "../SettingsLucaLinkTab.tsx?raw";
import { settingsExperienceMap } from "../settingsExperienceMap";

// The panes below still own the preview cards; three of the destinations that
// used to host them were merged away. Knowledge Base now renders inside Data &
// Memory, MCP Bridge inside Integrations, and Model Manager was relabelled
// Models. The cards moved with their files, so the labels are what changed.
const expectedExistingLabels = [
  "Personality",
  "Data & Memory",
  "Brain",
  "Models",
  "Integrations",
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
    // The merge retired these destinations; the cards they hosted did not move
    // files, so a stale label here would mean the map drifted back.
    for (const retired of ["Knowledge Base", "Model Manager", "MCP Bridge"]) {
      expect(labels).not.toContain(retired);
    }
  });

  it("keeps LucaLink handoff transport gated and PI data out of LucaLink", () => {
    // Live handoff exists now, but it ships dark behind an explicit
    // user-facing toggle and refuses unencrypted sends.
    expect(lucaLinkSource).toContain("Live handoff transport");
    expect(lucaLinkSource).toContain("liveHandoffEnabled");
    expect(lucaLinkSource).toContain("unencrypted sends are always refused");
    // Memory handoff stays intent-only, and no Personal Intelligence
    // subsystem data is wired into LucaLink surfaces.
    expect(lucaLinkSource).toContain(
      "raw memory databases are not transferred",
    );
    expect(lucaLinkSource).not.toContain("personalIntelligence");
    expect(lucaLinkSource).not.toContain("personal-intelligence");
  });
});
