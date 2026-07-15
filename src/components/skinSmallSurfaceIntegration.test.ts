const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const widgetModeSource = readFileSync("src/components/WidgetMode.tsx", "utf8");
const chatWidgetModeSource = readFileSync("src/components/ChatWidgetMode.tsx", "utf8");
const voiceHudSurfaceSource = readFileSync("src/components/voice/VoiceHudSurface.tsx", "utf8");
const widgetControlsSource = readFileSync("src/components/WidgetControls.tsx", "utf8");
const miniChatSurfaceSource = readFileSync("src/components/chat/LucaChatSurface.tsx", "utf8");
const hologramWidgetSource = readFileSync(
  "src/components/Hologram/HologramWidget.tsx",
  "utf8",
);

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
    expect(voiceHudSurfaceSource).toContain("selectedSkinId");
    expect(voiceHudSurfaceSource).not.toContain("settingsService");
    expect(voiceHudSurfaceSource).toContain("...voiceSkinVariables");
    expect(voiceHudSurfaceSource).toContain(
      "resolveVoiceHudSkinPalette(voiceSkinVariables",
    );
  });

  it("uses semantic materials around presence without coating the face renderer", () => {
    expect(widgetModeSource).toContain("lucaMaterialHudStyle");
    expect(widgetControlsSource).toContain("lucaMaterialControlStyle");
    expect(miniChatSurfaceSource).toContain("lucaMaterialFloatingPanelStyle");
    expect(voiceHudSurfaceSource).toContain("lucaMaterialHudStyle");
    expect(hologramWidgetSource).toContain("lucaMaterialPopoverStyle");
    expect(hologramWidgetSource).not.toContain("LucaLiquidGlassLayer");
  });
});
