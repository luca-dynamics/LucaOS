import { describe, expect, it } from "vitest";

const { readFileSync, readdirSync } = process.getBuiltinModule("node:fs");
const read = (file: string) => readFileSync(file, "utf8");
const entrySource = read("src/web/webBridgeEntry.tsx");
const lifecycleSource = read("src/web/WebLifecycleShell.tsx");
const onboardingSource = read("src/web/WebOnboardingSurface.tsx");
const mainSource = read("src/web/WebMainSurface.tsx");
const capabilitiesSource = read("src/web/WebHostCapabilitiesPanel.tsx");
const lucaLinkSource = read("src/web/WebLucaLinkSurface.tsx");
const diagnosticsSource = read("src/web/WebBridgeDiagnostics.tsx");
const bootstrapSource = read("src/index.tsx");

const forbidden = [
  "better-sqlite3", "robotjs", "eventsource", "whatsapp-web.js", "playwright",
  "express", "reactAppEntry", "electron", "child_process",
];
const sourceFiles = [
  ...readdirSync("src/web").filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes(".test.")),
].map((file) => read(`src/web/${file}`));
const staticImports = sourceFiles.flatMap((source) => source.match(/(?:from\s+|import\s*\()["'][^"']+["']/g) ?? []);

describe("WebBridge browser lifecycle and import boundary", () => {
  it("routes an unknown/new browser user into onboarding before the main surface", () => {
    expect(lifecycleSource).toContain('readWebOnboardingComplete() ? "ready" : "needs-onboarding"');
    expect(lifecycleSource).toContain("<WebOnboardingSurface");
    expect(onboardingSource).toContain("Let’s set up LucaOS for this browser.");
    expect(onboardingSource).not.toContain("View Capability Map");
    expect(onboardingSource).not.toContain("Open Web Chat");
  });

  it("routes returning browser users to the normal web-safe LucaOS surface", () => {
    expect(lifecycleSource).toContain('lifecycle === "ready"');
    expect(lifecycleSource).toContain("<WebMainSurface");
    expect(mainSource).toContain('data-web-surface="main"');
    expect(mainSource).toContain("What would you like to do?");
  });

  it("preserves capability and LucaLink work under settings instead of boot cards", () => {
    expect(mainSource).toContain("Host & Capabilities");
    expect(mainSource).toContain("Settings");
    expect(capabilitiesSource).toContain('data-settings-surface="host-capabilities"');
    expect(capabilitiesSource).toContain("Browser-safe capability map");
    expect(capabilitiesSource).toContain("Native and routed capability map");
    expect(capabilitiesSource).toContain("Route Unlock");
    expect(lucaLinkSource).toContain('data-settings-surface="lucalink"');
    expect(lucaLinkSource).toContain("Pair Desktop");
    expect(lucaLinkSource).toContain("Continue session on another host");
    expect(lifecycleSource).not.toContain("Choose a WebBridge route");
  });

  it("imports only local web modules or browser-safe shared UI primitives", () => {
    for (const reference of forbidden) {
      expect(staticImports.join("\n").toLowerCase()).not.toContain(reference.toLowerCase());
    }
    expect(staticImports.join("\n")).not.toMatch(/["'](?:node:)?fs["']/);
    expect(sourceFiles.join("\n")).toContain("../shared/ui/LucaWebPrimitives");
  });

  it("keeps diagnostics behind bootDebug and reports lifecycle fields", () => {
    expect(diagnosticsSource).toContain('get("bootDebug") !== "1"');
    for (const field of ["webLifecycleState", "onboardingComplete", "activeWebSurface"]) {
      expect(diagnosticsSource).toContain(field);
    }
  });

  it("keeps desktop loading behind the desktop entry selection branch", () => {
    expect(bootstrapSource).toContain('selectedEntry === "webBridgeEntry"');
    expect(bootstrapSource).toContain('import("./web/webBridgeEntry")');
    expect(bootstrapSource).toContain('import("./reactAppEntry")');
    expect(bootstrapSource.indexOf('import("./web/webBridgeEntry")')).toBeLessThan(bootstrapSource.indexOf('import("./reactAppEntry")'));
  });

  it("does not validate master keys or import desktop runtime from WebBridge entry", () => {
    expect(entrySource).not.toMatch(/master.?key/i);
    expect(entrySource).not.toContain("reactAppEntry");
  });
});
