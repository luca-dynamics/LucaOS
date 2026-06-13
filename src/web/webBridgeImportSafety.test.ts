import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const entrySource = readFileSync("src/web/webBridgeEntry.tsx", "utf8");
const shellSource = readFileSync("src/web/WebBridgeShell.tsx", "utf8");
const bootstrapSource = readFileSync("src/index.tsx", "utf8");

const forbidden = [
  "better-sqlite3",
  "robotjs",
  "electron",
  "eventsource",
  "whatsapp-web.js",
  "playwright",
  "express",
  "Master Key",
  "reactAppEntry",
  "desktop LucaLink host controller",
];

describe("WebBridge browser import boundary", () => {
  it("does not statically import the desktop app graph or native packages", () => {
    for (const reference of forbidden) {
      expect(entrySource.toLowerCase()).not.toContain(reference.toLowerCase());
      expect(shellSource.toLowerCase()).not.toContain(reference.toLowerCase());
    }
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
