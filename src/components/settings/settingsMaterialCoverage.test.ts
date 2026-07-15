const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

import {
  settingsCardStyle,
  settingsControlStyle,
  settingsSolidCardStyle,
  settingsSurfaceTokens,
} from "./settingsLayoutStyles";

const settingsModalSource = readFileSync(
  "src/components/SettingsModal.tsx",
  "utf8",
);
const settingsLucaLinkSource = readFileSync(
  "src/components/settings/SettingsLucaLinkTab.tsx",
  "utf8",
);

describe("Settings material coverage", () => {
  it("routes standard Settings cards and controls through semantic textures", () => {
    expect(settingsCardStyle.background).toContain("radial-gradient");
    expect(settingsSolidCardStyle.background).toContain("radial-gradient");
    expect(settingsControlStyle.background).toContain("radial-gradient");
    expect(settingsSurfaceTokens.glass).toContain("--luca-material-card-surface");
  });

  it("assigns semantic material roles to the modal hierarchy", () => {
    for (const role of ["overlay", "sidebar", "control"]) {
      expect(settingsModalSource).toContain(`data-luca-material-role="${role}"`);
    }
    expect(settingsModalSource).toContain("<LucaDialog");

    expect(settingsModalSource).toContain(
      'data-luca-material-role={isActive ? "tab-active" : "tab"}',
    );
    expect(settingsModalSource).toContain("lucaMaterialDialogStyle");
    expect(settingsModalSource).toContain("lucaMaterialSidebarStyle");
    expect(settingsModalSource).toContain("lucaMaterialTabActiveStyle");
  });

  it("uses optical material tone for every light-skin contrast fix", () => {
    expect(settingsModalSource).toContain('.materialTone === "light"');
    expect(settingsModalSource).not.toContain('.modeAffinity === "light"');
  });

  it("keeps the dense LucaLink tab on shared card and control recipes", () => {
    expect(settingsLucaLinkSource).not.toMatch(
      /backgroundColor:\s*settingsSurfaceTokens\.(glass|elevated)/,
    );
    expect(settingsLucaLinkSource).toContain("settingsCardStyle.background");
    expect(settingsLucaLinkSource).toContain("settingsControlStyle.background");
  });
});
