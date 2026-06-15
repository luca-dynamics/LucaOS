import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LucaCanvasPresenceOrb } from "./LucaCanvasPresenceOrb";

const { readFileSync } = process.getBuiltinModule("node:fs");
const componentSource = readFileSync(
  "src/components/visual/LucaCanvasPresenceOrb.tsx",
  "utf8",
);
const rendererSource = readFileSync(
  "src/components/visual/lucaCanvasOrbRenderer.ts",
  "utf8",
);

describe("LucaCanvasPresenceOrb", () => {
  it("renders a compact canvas sourced from the Dictation/Voice liquid orb", () => {
    const html = renderToStaticMarkup(
      <LucaCanvasPresenceOrb state="preparing" size={22} />,
    );

    expect(html).toContain("<canvas");
    expect(html).toContain('width="44"');
    expect(html).toContain(
      'data-visual-source="dictation-voice-canvas-orb"',
    );
    expect(rendererSource).toContain("liquid-plasma");
    expect(rendererSource).toContain("createRadialGradient");
    expect(rendererSource).toContain("Math.sin(angle * 3 + time)");
  });

  it("has no voice, desktop, provider, or event runtime imports", () => {
    const source = `${componentSource}\n${rendererSource}`.toLowerCase();
    for (const forbidden of [
      "eventbus",
      "lucaservice",
      "voicehud",
      "widgetmode",
      "voicevisualizer",
      "electron",
      "llmservice",
      "liveservice",
      "settingsservice",
      "personalityservice",
      "soundservice",
      "better-sqlite3",
      "@google/generative-ai",
      "openai",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
