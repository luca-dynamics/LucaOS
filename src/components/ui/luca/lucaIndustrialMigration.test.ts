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
    expect(dialog).toContain('role={modal ? "dialog" : role}');
    expect(dialog).toContain("aria-modal={modal || undefined}");
  });

  it("provides governed controls, cards, panels, fields, and typed icons", () => {
    const exports = read("src/components/ui/luca/index.ts");
    const field = read("src/components/ui/luca/LucaField.tsx");
    expect(exports).toContain("LucaButton, LucaIconButton");
    expect(exports).toContain("LucaCardHeader");
    expect(exports).toContain("LucaPanelHeader");
    expect(exports).toContain("LucaFieldGroup");
    expect(exports).toContain("LucaTooltip");
    expect(field).toContain('role="switch"');
    expect(field).toContain("aria-checked={checked}");
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
