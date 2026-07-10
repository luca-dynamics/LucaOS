import { describe, expect, it } from "vitest";
import source from "./WebRealHologramSurface.tsx?raw";

describe("WebRealHologramSurface", () => {
  it("mounts the shared Luca hologram presence as a passive web layer", () => {
    expect(source).toContain("LucaHologramPresence");
    expect(source).toContain("data-luca-web-real-hologram-surface");
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain("pointer-events-none");
    expect(source).toContain('state="ready"');
  });

  it("avoids desktop hologram and visual-core runtimes", () => {
    expect(source).not.toContain("HologramWidget");
    expect(source).not.toContain("HologramScene");
    expect(source).not.toContain("LucaHologramShaderPresence");
    expect(source).not.toContain("VisualCore");
    expect(source).not.toContain("electron");
    expect(source).not.toContain("ipcRenderer");
  });
});
