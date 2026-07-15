const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const overlayManager = read("src/components/layout/OverlayManager.tsx");
const sharedOverlays = read("src/surfaces/shared/SharedOverlayPanels.tsx");
const originOverlays = read("src/surfaces/origin/OriginOverlayPanels.tsx");
const safeComponent = read("src/components/SafeComponent.tsx");
const errorToast = read("src/components/lucaLink/ErrorToast.tsx");

describe("transient material coverage", () => {
  it("materializes overlay foregrounds without texturing their scrims", () => {
    expect(overlayManager).toContain("lucaMaterialHudStyle");
    expect(overlayManager).toContain('data-luca-material-role="overlay"');
    expect(sharedOverlays).toContain("lucaMaterialDialogStyle");
    expect(sharedOverlays).toContain("bg-black/90");
    expect(originOverlays).toContain("lucaMaterialDialogStyle");
    expect(originOverlays).toContain("var(--luca-danger,#f87171)");
    expect(overlayManager).not.toContain("glass-blur[20px]");
  });

  it("uses neutral skin material beneath semantic error colors", () => {
    expect(safeComponent).toContain("lucaMaterialCardStyle");
    expect(safeComponent).toContain('role="alert"');
    expect(errorToast).toContain("lucaMaterialHudStyle");
    expect(errorToast).toContain("lucaMaterialControlStyle");
    expect(errorToast).not.toContain("bg-black/95");
    expect(errorToast).not.toMatch(/text-gray-[0-9]/);
  });

  it("provides a reduced-motion fallback for transient toast movement", () => {
    expect(errorToast).toContain("prefers-reduced-motion: reduce");
    expect(errorToast).toContain("transition-duration: 0.01ms");
  });
});
