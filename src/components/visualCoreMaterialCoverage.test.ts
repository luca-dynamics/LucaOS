const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const visualCore = readFileSync("src/components/VisualCore.tsx", "utf8");
const visionHud = readFileSync("src/components/VisionHUD.tsx", "utf8");

describe("VisualCore material coverage", () => {
  it("routes the shell and its nested header through separate material depths", () => {
    expect(visualCore).toContain('data-luca-material-role="visual-core"');
    expect(visualCore).toContain("lucaMaterialPanelStyle");
    expect(visualCore).toContain("lucaMaterialSolidCardStyle");
    expect(visualCore).toContain("lucaMaterialControlStyle");
    expect(visualCore).not.toContain("rgba(255, 255, 255, ${syncState.opacity})");
    expect(visualCore).not.toContain("rgba(0, 0, 0, ${syncState.opacity})");
  });

  it("keeps media modes dark while skinning the visible vision status HUD", () => {
    expect(visualCore).toContain('mode === "CINEMA"');
    expect(visualCore).toContain("transition-opacity duration-500 bg-black");
    expect(visionHud).toContain('data-luca-material-role="hud"');
    expect(visionHud).toContain("lucaMaterialHudStyle");
  });
});
