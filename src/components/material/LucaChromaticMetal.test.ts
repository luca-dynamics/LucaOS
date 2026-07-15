import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("Luca chromatic metal", () => {
  it("uses a texture ramp so WebGL 1-style variable uniform indexing is avoided", () => {
    const source = readFileSync("src/components/presence/chromaticMetalRenderer.ts", "utf8");
    expect(source).toContain("sampler2D u_ramp");
    expect(source).toContain("texture(u_ramp");
    expect(source).not.toMatch(/uniform\s+vec[34]\s+\w+\[/);
  });

  it("provides orb, rounded, and capsule shape adapters", () => {
    const source = readFileSync("src/components/presence/chromaticMetalRenderer.ts", "utf8");
    expect(source).toContain('"orb" | "rounded" | "capsule"');
    expect(source).toContain("roundedBox");
  });

  it("draws immediately and has governed renderer lifecycle", () => {
    const source = readFileSync("src/components/presence/chromaticMetalRenderer.ts", "utf8");
    expect(source).toContain("draw(performance.now())");
    expect(source).toContain("gl.getShaderInfoLog");
    const component = readFileSync("src/components/material/LucaChromaticMetal.tsx", "utf8");
    expect(component).toContain("ResizeObserver");
    expect(component).toContain("IntersectionObserver");
    expect(component).toContain("webglcontextlost");
  });
});
