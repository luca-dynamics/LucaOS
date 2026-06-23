import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync(
  "src/components/dashboard/LucaDashboardSurface.tsx",
  "utf8",
);
const appSource = readFileSync("src/App.tsx", "utf8");

import { LucaDashboardSurface } from "./LucaDashboardSurface";

const forbiddenRuntimeImports = [
  "electron",
  "window.electron",
  "window.luca",
  "eventBus",
  "lucaService",
  "llmService",
  "liveService",
  "soundService",
  "settingsService",
  "personalityService",
  "awarenessService",
  "conversationService",
  "lucaLinkManager",
  "node:fs",
  "better-sqlite3",
  "@capacitor/core",
];

describe("LucaDashboardSurface", () => {
  it("exists as the shared dashboard extraction and renders dashboard slots", () => {
    const html = renderToStaticMarkup(
      <LucaDashboardSurface
        headerSurface={<div>header slot</div>}
        leftPanel={<div>hologram slot</div>}
        chatSurface={<div>chat slot</div>}
        voiceSurface={<div>voice slot</div>}
        visualCoreSurface={<div>visual slot</div>}
        rightPanel={<div>right slot</div>}
        settingsSurface={<div>settings slot</div>}
      />,
    );

    expect(html).toContain(
      'data-luca-dashboard-surface="original-app-extraction"',
    );
    expect(html).toContain("header slot");
    expect(html).toContain("hologram slot");
    expect(html).toContain("chat slot");
    expect(html).toContain("voice slot");
    expect(html).toContain("visual slot");
    expect(html).toContain("right slot");
    expect(html).toContain("settings slot");
  });

  it("uses original LucaOS dashboard layout primitives instead of WebBridge shell copy", () => {
    for (const originalPrimitive of [
      "lucaShellClassNames",
      "lucaMobileClassNames",
      "PanelResizer",
      "ACTIVITY_RAIL_ICONS",
      "mobileNavigationLabel",
      "leftToggleIcon",
      "rightToggleIcon",
    ]) {
      expect(source).toContain(originalPrimitive);
    }
  });

  it("stays props-only and browser-safe", () => {
    for (const reference of forbiddenRuntimeImports) {
      expect(source.toLowerCase()).not.toContain(reference.toLowerCase());
    }
  });

  it("applies selected skin material variables only at the dashboard boundary", () => {
    expect(appSource).toContain("resolveLucaDashboardSkinBoundary");
    expect(appSource).toContain("dashboardSkinBoundary.materialVariables");
    expect(appSource).not.toContain("document.documentElement.style.setProperty");
  });

  it("does not render WebBridge diagnostics or runtime wording", () => {
    for (const copy of [
      "WebBridge",
      "browser-safe",
      "runtime adapter",
      "model execution adapter",
      "Native routes",
      "debug route",
      "capability manifest",
      "host class",
    ]) {
      expect(source).not.toContain(copy);
    }
  });
});
