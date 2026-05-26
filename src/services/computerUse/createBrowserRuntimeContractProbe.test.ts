import { describe, expect, it } from "vitest";
import {
  createBrowserRuntimeContractProbe,
  DISCOVERED_BROWSER_RUNTIME_CANDIDATES,
  getDiscoverySnapshot,
} from "./createBrowserRuntimeContractProbe";

describe("createBrowserRuntimeContractProbe", () => {
  it("exposes discovery candidates and safe metadata", () => {
    const snapshot = getDiscoverySnapshot();

    expect(snapshot.candidates).toEqual(DISCOVERED_BROWSER_RUNTIME_CANDIDATES);
    expect(snapshot.candidates.length).toBeGreaterThan(0);
    expect(snapshot.metadata).toEqual({
      contractKind: "discovery",
      browserRuntimeImported: false,
      playwrightCalled: false,
      browserApisCalled: false,
      systemApisCalled: false,
    });
    expect(snapshot.safety).toEqual({
      browserRuntimeImported: false,
      playwrightCalled: false,
      browserApisCalled: false,
      systemApisCalled: false,
    });
  });

  it("probes known and unknown candidates without importing runtime modules", () => {
    const probe = createBrowserRuntimeContractProbe();
    const known = probe.probe({
      candidateName: "BrowserRuntime router",
      candidatePath: "src/services/browserRuntime/BrowserRuntimeRouter.ts",
    });
    const unknown = probe.probe({
      candidateName: "Unknown candidate",
      candidatePath: "src/services/browserRuntime/Unknown.ts",
    });

    expect(known.accepted).toBe(true);
    expect(known.metadata.browserRuntimeImported).toBe(false);
    expect(known.metadata.playwrightCalled).toBe(false);

    expect(unknown.accepted).toBe(false);
    expect(unknown.metadata.browserApisCalled).toBe(false);
    expect(unknown.metadata.systemApisCalled).toBe(false);
  });
});
