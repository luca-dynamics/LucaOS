import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const read = (relativePath: string) =>
  readFileSync(relativePath, "utf8");

describe("Luca industrial component migrations", () => {
  it("owns modal focus, Escape, scroll lock, and focus restoration centrally", () => {
    const foundation = read("src/components/ui/luca/lucaOverlayFoundation.ts");
    const dialog = read("src/components/ui/luca/LucaDialog.tsx");
    expect(foundation).toContain('event.key === "Escape"');
    expect(foundation).toContain('event.key !== "Tab"');
    expect(foundation).toContain('document.body.style.overflow = "hidden"');
    expect(foundation).toContain("returnTarget.focus");
    expect(dialog).toContain('role={modal ? modalRole : role}');
    expect(dialog).toContain("aria-modal={modal || undefined}");
    expect(dialog).toContain('data-luca-material-role="overlay"');
  });

  it("provides governed controls, cards, panels, fields, and typed icons", () => {
    const exports = read("src/components/ui/luca/index.ts");
    const field = read("src/components/ui/luca/LucaField.tsx");
    expect(exports).toContain("LucaButton, LucaIconButton");
    expect(exports).toContain("LucaCardHeader");
    expect(exports).toContain("LucaPanelHeader");
    expect(exports).toContain("LucaFieldGroup");
    expect(exports).toContain("LucaInput, LucaTextarea");
    expect(exports).toContain("LucaAlert, LucaBadge, LucaEmpty");
    expect(exports).toContain("LucaTooltip");
    expect(field).toContain('role="switch"');
    expect(field).toContain("aria-checked={checked}");
  });

  it("moves the system modal fleet onto governed dialog layers", () => {
    const modalFiles = [
      "src/components/AdminGrantModal.tsx",
      "src/components/AgentModePanel.tsx",
      "src/components/AppExplorerModal.tsx",
      "src/components/ChromeProfilePrompt.tsx",
      "src/components/HumanInputModal.tsx",
      "src/components/IngestionModal.tsx",
      "src/components/LucaLinkModal.tsx",
      "src/components/ModelManager.tsx",
      "src/components/ProfileManager.tsx",
      "src/components/VoiceCommandConfirmation.tsx",
      "src/components/browser/SandboxedBrowserShell.tsx",
      "src/components/llm/OfflineModelManager.tsx",
    ];
    for (const file of modalFiles) {
      const source = read(file);
      expect(source, file).toContain("<LucaDialogOverlay");
      expect(source, file).toContain("<LucaDialog");
      expect(source, file).not.toMatch(/z-\[(90|100|120|200|300|400|1000|9999)\]/);
    }
  });

  it("routes major Settings forms through governed controls", () => {
    const files = [
      "SettingsAutonomyTab.tsx",
      "SettingsBrainTab.tsx",
      "SettingsDataTab.tsx",
      "SettingsIoTTab.tsx",
      "SettingsLucaLinkTab.tsx",
      "SettingsMCPTab.tsx",
      "SettingsVisionTab.tsx",
      "SettingsVoiceTab.tsx",
    ];
    for (const file of files) {
      const source = read(`src/components/settings/${file}`);
      expect(source, file).toMatch(/<Luca(Input|Select|Slider|Textarea)/);
    }
  });

  it("uses named layers for model menus and VoiceHUD nesting", () => {
    const modelSwitcher = read("src/components/chat/ChatModelSwitcher.tsx");
    const voiceHud = read("src/components/voice/VoiceHudSurface.tsx");
    expect(modelSwitcher).toContain('<LucaPopover');
    expect(modelSwitcher).toContain('role="menuitemradio"');
    expect(modelSwitcher).not.toContain("z-[100]");
    expect(voiceHud).toContain('lucaLayerStyle("critical")');
    expect(voiceHud).not.toContain('<div className="fixed inset-0 z-[300]">');
  });

  it("routes Settings through the governed modal and form primitives", () => {
    const modal = read("src/components/SettingsModal.tsx");
    const appearance = read("src/components/settings/SettingsAppearanceTab.tsx");
    expect(modal).toContain("<LucaDialog");
    expect(modal).toContain("onRequestClose={onClose}");
    expect(modal).not.toContain("z-[70]");
    expect(appearance).toContain("<LucaSelect");
    expect(appearance.match(/<LucaSlider/g)).toHaveLength(3);
    expect(appearance).not.toContain('type="range"');
  });

  it("routes floating and global overlays through named layers", () => {
    const floating = read("src/components/layout/FloatingPanel.tsx");
    const overlays = read("src/components/layout/OverlayManager.tsx");
    expect(floating).toContain('lucaLayerStyle("panel")');
    expect(floating).toContain("<LucaPanelHeader");
    expect(floating).toContain("<LucaIconButton");
    expect(floating).toContain("<LucaIcon");
    expect(floating).not.toContain("z-[100]");
    expect(overlays).toContain('lucaLayerStyle("critical")');
    expect(overlays).toContain('lucaLayerStyle("system")');
    expect(overlays).not.toContain("z-[1000]");
    expect(overlays).not.toContain("z-[2000]");
  });
});
