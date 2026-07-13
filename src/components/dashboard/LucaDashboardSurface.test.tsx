import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
// Normalize line endings so exact-string assertions survive git autocrlf
// checkouts on Windows.
const source = readFileSync(
  "src/components/dashboard/LucaDashboardSurface.tsx",
  "utf8",
).replace(/\r\n/g, "\n");
const appSource = readFileSync("src/App.tsx", "utf8").replace(/\r\n/g, "\n");

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

  it("renders side panels as drawer overlays above a scrim when open", () => {
    const html = renderToStaticMarkup(
      <LucaDashboardSurface
        leftPanel={<div>left slot</div>}
        chatSurface={<div>chat slot</div>}
        rightPanel={<div>right slot</div>}
        leftPanelCollapsed
        rightPanelCollapsed
        leftDrawerOpen
        rightDrawerOpen
      />,
    );

    expect(html).toContain("absolute left-0 top-0 z-40");
    expect(html).toContain("absolute right-0 top-0 z-40");
    expect(html).toContain("bg-black/40");
    expect(html).toContain("left slot");
    expect(html).toContain("right slot");
    expect(html).toContain("chat slot");
  });

  it("keeps panels docked in normal flow when drawers are closed", () => {
    const html = renderToStaticMarkup(
      <LucaDashboardSurface
        leftPanel={<div>left slot</div>}
        chatSurface={<div>chat slot</div>}
        rightPanel={<div>right slot</div>}
      />,
    );

    expect(html).not.toContain("absolute left-0 top-0 z-40");
    expect(html).not.toContain("absolute right-0 top-0 z-40");
    expect(html).not.toContain("bg-black/40");
    expect(html).toContain("left slot");
    expect(html).toContain("right slot");
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

  it("applies the mobile resolver only to the local mobile dashboard container", () => {
    expect(appSource).toContain("resolveLucaMobileSkinBoundary");
    expect(appSource).toContain('hostKind: "mobile-web"');
    expect(appSource).toContain("mobileSkinBoundary.materialVariables");
    expect(appSource).toContain("settingsService.getSettings().general.selectedSkinId");
    expect(appSource).toContain("isMobile\n            ? mobileSkinBoundary.materialVariables\n            : dashboardSkinBoundary.materialVariables");
  });

  it("keeps mobile skin application away from global providers and Flow motion", () => {
    const mobileBoundaryStart = appSource.indexOf("const mobileSkinBoundary");
    const mobileBoundaryEnd = appSource.indexOf("// console.log", mobileBoundaryStart);
    const mobileBoundarySource = appSource.slice(mobileBoundaryStart, mobileBoundaryEnd);
    const mobileStyleStart = appSource.indexOf("mobileSkinBoundary.materialVariables");
    const mobileStyleEnd = appSource.indexOf("</SafeComponent>", mobileStyleStart);
    const mobileStyleSource = appSource.slice(mobileStyleStart, mobileStyleEnd);
    const mobileApplicationSource = `${mobileBoundarySource}\n${mobileStyleSource}`;

    for (const forbidden of [
      "document.documentElement",
      "style.setProperty",
      "document.body",
      "body.style",
      'document.querySelector("html")',
      "@keyframes",
      "requestAnimationFrame",
      "setInterval",
      "setTimeout",
      "animation:",
    ]) {
      expect(mobileApplicationSource.includes(forbidden), forbidden).toBe(false);
    }

    expect(appSource).not.toContain("LucaSkinProvider");
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
