import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("Appearance optical material controls", () => {
  it("keeps common controls visible and advanced controls disclosed", () => {
    const source = readFileSync("src/components/settings/OpticalMaterialControls.tsx", "utf8");
    expect(source).toContain('label="Refraction"');
    expect(source).toContain('label="Frost"');
    expect(source).toContain("<details");
    for (const label of ["Light", "Glass depth", "Dispersion", "Edge falloff", "Metal depth", "Rounding", "Roughness", "RGB split", "Scale", "Stretch", "Angle", "Repeats", "Offset", "Phase", "Evolution"]) {
      expect(source, label).toContain(`label="${label}"`);
    }
    expect(source).toContain(">Gradient</p>");
  });

  it("uses the visible preview canvas as the exact lens source", () => {
    const source = readFileSync("src/components/settings/OpticalMaterialPreview.tsx", "utf8");
    expect(source).toContain("<canvas ref={canvasRef}");
    expect(source).toContain("background={canvasRef.current}");
    expect(source).toContain('shape="capsule"');
  });
});
