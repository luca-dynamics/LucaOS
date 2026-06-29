const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const widgetModeSource = readFileSync("src/components/WidgetMode.tsx", "utf8");
const chatWidgetModeSource = readFileSync("src/components/ChatWidgetMode.tsx", "utf8");
const voiceHudSurfaceSource = readFileSync("src/components/voice/VoiceHudSurface.tsx", "utf8");

describe("small surface skin integration", () => {
  it("applies selected skin variables to Widget mode", () => {
    expect(widgetModeSource).toContain("getLucaSkinMaterialVariables");
    expect(widgetModeSource).toContain("settingsService.getSettings().general.selectedSkinId");
    expect(widgetModeSource).toContain("...widgetSkinVariables");
    expect(widgetModeSource).toContain('widgetSkinVariables["--luca-accent-primary"]');
  });

  it("applies selected skin variables to MiniChat mode", () => {
    expect(chatWidgetModeSource).toContain("getLucaSkinMaterialVariables");
    expect(chatWidgetModeSource).toContain("settingsService.getSettings().general.selectedSkinId");
    expect(chatWidgetModeSource).toContain("style={chatSkinVariables as React.CSSProperties}");
    expect(chatWidgetModeSource).toContain('chatSkinVariables["--luca-accent-primary"]');
  });

  it("applies selected skin variables to VoiceHUD surface", () => {
    expect(voiceHudSurfaceSource).toContain("getLucaSkinMaterialVariables");
    expect(voiceHudSurfaceSource).toContain("settingsService.getSettings().general.selectedSkinId");
    expect(voiceHudSurfaceSource).toContain("...voiceSkinVariables");
    expect(voiceHudSurfaceSource).toContain('voiceSkinVariables["--luca-accent-primary"]');
  });
});
