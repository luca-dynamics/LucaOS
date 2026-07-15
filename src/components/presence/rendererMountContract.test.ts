import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("renderer mount contract", () => {
  it("uses the settings service's real named export before React mounts", () => {
    const scene = readFileSync("src/components/Hologram/HologramScene.tsx", "utf8");
    const presence = readFileSync("src/components/presence/LiquidPresenceMark.tsx", "utf8");

    expect(scene).toContain('import { settingsService, type LucaSettings }');
    expect(presence).toContain('import { settingsService }');
    expect(scene).not.toMatch(/import\s+settingsService\s*,/);
    expect(presence).not.toMatch(/import\s+settingsService\s+from/);
  });

  it("keeps the local Three module contract aligned with vec4 shader uniforms", () => {
    const declarations = readFileSync("src/types/modules.d.ts", "utf8");
    expect(declarations).toContain("class Vector4");
    expect(declarations).toContain("export import Vector4 = THREE.Vector4");
  });
});
