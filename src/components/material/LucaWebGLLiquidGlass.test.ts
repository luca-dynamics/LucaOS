import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("Luca flagship liquid glass", () => {
  it("requires an explicitly matching background and falls back honestly", () => {
    const source = readFileSync("src/components/material/LucaWebGLLiquidGlass.tsx", "utf8");
    expect(source).toContain("background?: TexImageSource | null");
    expect(source).toContain("setFallback(true)");
    expect(source).not.toContain("capturePage");
    expect(source).not.toContain("getDisplayMedia");
  });

  it("governs resize, visibility, offscreen, reduced-motion, and context lifecycle", () => {
    const source = readFileSync("src/components/material/LucaWebGLLiquidGlass.tsx", "utf8");
    expect(source).toContain("ResizeObserver");
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("webglcontextlost");
    expect(source).toContain("webglcontextrestored");
  });

  it("exposes the six glass controls to the shader", () => {
    const source = readFileSync("src/components/presence/liquidGlassLensRenderer.ts", "utf8");
    for (const control of ["light", "refraction", "depth", "dispersion", "frost", "edgeFalloff"]) {
      expect(source, control).toContain(`tuning.${control}`);
    }
    expect(source).toContain("sampleFrostedBg");
    expect(source).toContain("gl.getShaderInfoLog");
  });
});
