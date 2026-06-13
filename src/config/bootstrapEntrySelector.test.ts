import { describe, expect, it } from "vitest";
import { selectLucaBootstrapEntry } from "./bootstrapEntrySelector";

describe("selectLucaBootstrapEntry", () => {
  it("selects WebBridge for Vercel and ordinary browser hosts", () => {
    expect(
      selectLucaBootstrapEntry({
        releaseTarget: "web",
        runtimeTarget: "vercel",
        hostname: "preview-luca.vercel.app",
      }),
    ).toBe("webBridgeEntry");
    expect(
      selectLucaBootstrapEntry({
        hostname: "localhost",
        hasBrowserRuntime: true,
      }),
    ).toBe("webBridgeEntry");
  });

  it("keeps Electron on the full desktop app entry even with web env drift", () => {
    expect(
      selectLucaBootstrapEntry({
        releaseTarget: "web",
        runtimeTarget: "vercel",
        hostname: "app.lucaos.space",
        isElectronRuntime: true,
      }),
    ).toBe("desktopAppEntry");
  });
});
