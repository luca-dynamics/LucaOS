import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("Hologram presence controls", () => {
  const source = readFileSync("src/components/Hologram/HologramWidget.tsx", "utf8");

  it("keeps only the three current presence actions", () => {
    expect(source).toContain('id: "VOICE"');
    expect(source).toContain('id: "MONITOR"');
    expect(source).toContain('id: "EXPAND"');
    expect(source).toContain("TALK TO LUCA");
    expect(source).toContain("SEE SCREEN");
    expect(source).toContain("OPEN LUCAOS");
  });

  it("does not expose legacy translation and transcription mode buttons", () => {
    expect(source).not.toContain('id: TranslationMode.ONE_WAY');
    expect(source).not.toContain('id: TranslationMode.INTERPRETER');
    expect(source).not.toContain('id: TranslationMode.TRANSCRIBE');
    expect(source).not.toContain("1-WAY TRANSLATE");
    expect(source).not.toContain("INTERPRETER MODE");
    expect(source).not.toContain("LIVE TRANSCRIPT");
  });

  it("materializes helper chrome while leaving the hologram scene direct", () => {
    expect(source).toContain("lucaMaterialCardStyle");
    expect(source).toContain("lucaMaterialHudStyle");
    expect(source).toContain("lucaMaterialControlStyle");
    expect(source).not.toContain("LucaLiquidGlassLayer");
  });
});
