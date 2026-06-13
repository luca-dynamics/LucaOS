import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const { readdirSync } = process.getBuiltinModule("node:fs");
const entrySource = readFileSync("src/web/webBridgeEntry.tsx", "utf8");
const shellSource = readFileSync("src/web/WebBridgeShell.tsx", "utf8");
const diagnosticsSource = readFileSync(
  "src/web/WebBridgeDiagnostics.tsx",
  "utf8",
);
const bootstrapSource = readFileSync("src/index.tsx", "utf8");

const forbidden = [
  "better-sqlite3",
  "robotjs",
  "eventsource",
  "whatsapp-web.js",
  "playwright",
  "express",
  "Master Key",
  "reactAppEntry",
];
const webSources = readdirSync("src/web")
  .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".test.ts"))
  .map((file) => readFileSync(`src/web/${file}`, "utf8"));
const staticImports = webSources.flatMap(
  (source) =>
    source.match(/(?:from\s+|import\s*\()["'][^"']+["']/g) ?? [],
);

describe("WebBridge browser import boundary", () => {
  it("does not statically import the desktop app graph or native packages", () => {
    for (const reference of forbidden) {
      expect(staticImports.join("\n").toLowerCase()).not.toContain(
        reference.toLowerCase(),
      );
    }
    expect(staticImports.join("\n")).not.toMatch(
      /["'](?:node:)?(?:fs|child_process)["']/,
    );
  });

  it("renders a host-aware product surface and governed unlock routes", () => {
    expect(shellSource).toContain("LucaOS WebBridge");
    expect(shellSource).toContain("Desktop Web");
    expect(shellSource).toContain("Mobile Web");
    expect(shellSource).toContain("Smart TV Web");
    expect(shellSource).toContain("Embedded Web");
    expect(shellSource).toContain("Unknown Browser Host");
    expect(shellSource).toContain("Route Unlock");
    expect(shellSource).toContain("LucaLink session porting");
  });

  it("keeps diagnostics behind the explicit bootDebug query", () => {
    expect(diagnosticsSource).toContain('get("bootDebug") !== "1"');
    expect(shellSource).not.toContain("?bootDebug=1");
  });

  it("keeps desktop loading behind the desktop entry selection branch", () => {
    expect(bootstrapSource).toContain('selectedEntry === "webBridgeEntry"');
    expect(bootstrapSource).toContain('import("./web/webBridgeEntry")');
    expect(bootstrapSource).toContain('import("./reactAppEntry")');
    expect(bootstrapSource.indexOf('import("./web/webBridgeEntry")')).toBeLessThan(
      bootstrapSource.indexOf('import("./reactAppEntry")'),
    );
  });

  it("does not install a Buffer shim or validate a master key in WebBridge bootstrap", () => {
    expect(bootstrapSource).not.toContain('from "buffer"');
    expect(entrySource).not.toMatch(/master.?key/i);
  });
});
