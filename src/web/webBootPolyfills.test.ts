import { afterEach, describe, expect, it, vi } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

const polyfillSource = readFileSync("src/web/webBootPolyfills.ts", "utf8");
const bootstrapSource = readFileSync("src/index.tsx", "utf8");

const forbiddenWebBootImports = [
  "electron",
  "better-sqlite3",
  "node:fs",
  "node:path",
  "lucaService",
  "conversationService",
  "voiceSessionOrchestrator",
  "ToolRegistry",
  "ScreenShare",
  "SecurityGate",
];

describe("web boot Buffer polyfill", () => {
  const originalBuffer = globalThis.Buffer;
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.resetModules();
    Object.defineProperty(globalThis, "Buffer", {
      configurable: true,
      value: originalBuffer,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
      writable: true,
    });
  });

  it("defines globalThis.Buffer and window.Buffer in a browser-like runtime", async () => {
    Reflect.deleteProperty(globalThis, "Buffer");
    const browserWindow = {} as Window & typeof globalThis;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: browserWindow,
    });

    await import("./webBootPolyfills");

    expect(globalThis.Buffer).toBeDefined();
    expect(globalThis.Buffer.from("luca").toString("base64")).toBe("bHVjYQ==");
    expect(browserWindow.Buffer).toBe(globalThis.Buffer);
  });

  it("is imported before any app/runtime import in the React bootstrap", () => {
    const firstImport = bootstrapSource.match(/^import[^;]+;/m)?.[0];

    expect(firstImport).toBe('import "./web/webBootPolyfills";');
    const polyfillImportIndex = bootstrapSource.indexOf(
      'import "./web/webBootPolyfills";',
    );

    expect(polyfillImportIndex).toBeLessThan(
      bootstrapSource.indexOf("./config/bootstrapEntrySelector"),
    );
    expect(polyfillImportIndex).toBeLessThan(
      bootstrapSource.indexOf('import("./web/webBridgeEntry")'),
    );
  });

  it("keeps webBootPolyfills limited to the browser Buffer package", () => {
    expect(polyfillSource).toContain('from "buffer"');
    expect(polyfillSource).toContain("globalThis.Buffer");
    expect(polyfillSource).toContain("window.Buffer");

    for (const forbiddenImport of forbiddenWebBootImports) {
      expect(polyfillSource).not.toContain(forbiddenImport);
    }
  });
});
