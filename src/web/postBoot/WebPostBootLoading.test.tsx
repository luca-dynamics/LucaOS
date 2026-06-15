import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebPostBootLoading } from "./WebPostBootLoading";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync(
  "src/web/postBoot/WebPostBootLoading.tsx",
  "utf8",
);

describe("WebPostBootLoading", () => {
  it("renders the Luca canvas orb and remains free of generic loaders", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);

    expect(html).toContain("Preparing LucaOS");
    expect(html).toContain("Starting Luca&#x27;s web session…");
    expect(html).toContain('data-visual-source="dictation-voice-canvas-orb"');
    expect(html).not.toContain("&gt;");
    expect(html).not.toContain("Luca is waking up");
    expect(html).not.toContain("/models/avatar.glb");
    expect(html).not.toContain("rounded-full bg-cyan-100");
    expect(html).not.toContain("shadow-[0_0_24px_8px");
  });

  it("imports only the browser-safe extracted visual", () => {
    expect(source).toContain(
      'import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb"',
    );
    expect(source.match(/^import .* from .*;$/gm)).toEqual([
      'import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";',
    ]);
    expect(source).not.toContain("rounded-full bg-cyan-100");
    expect(source).not.toContain("rgba(207,250,254,0.42)");

    for (const forbidden of [
      "localStorage",
      "navigator.permissions",
      "VoiceHud",
      "VoiceVisualizer",
      "WidgetMode",
      "eventBus",
      "lucaService",
      "llmService",
      "liveService",
      "settingsService",
      "personalityService",
      "soundService",
      "electron",
      "better-sqlite3",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
