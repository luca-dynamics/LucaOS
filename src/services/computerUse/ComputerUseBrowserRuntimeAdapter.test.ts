import { describe, expect, it } from "vitest";
import { ComputerUseBrowserRuntimeAdapterScaffold } from "./ComputerUseBrowserRuntimeAdapter";

const validRequest = {
  lane: "sandbox_browser" as const,
  action: { type: "click" as const, reason: "open page", requiresGuardApproval: false },
};

describe("ComputerUseBrowserRuntimeAdapterScaffold", () => {
  it("rejects without explicit opt-in", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold();
    expect(adapter.canHandle(validRequest)).toBe(false);
    const result = await adapter.execute(validRequest);
    expect(result.status).toBe("failed");
    expect(result.metadata.requiresExplicitOptIn).toBe(true);
  });

  it("accepts with browserRuntimeEnabled", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { browserRuntimeEnabled: true } });
    expect(adapter.canHandle(validRequest)).toBe(true);
    const result = await adapter.execute(validRequest);
    expect(result.status).toBe("executed");
    expect(result.metadata.simulated).toBe(true);
  });

  it("accepts with enableBrowserRuntimeBridge", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { enableBrowserRuntimeBridge: true } });
    expect(adapter.canHandle(validRequest)).toBe(true);
  });

  it("rejects malformed requests safely", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { browserRuntimeEnabled: true } });
    const result = await adapter.execute({ lane: "sandbox_browser" });
    expect(result.status).toBe("failed");
  });

  it("metadata reports no browser/system side effects", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { browserRuntimeEnabled: true } });
    const result = await adapter.execute(validRequest);
    expect(result.metadata.browserRuntimeImported).toBe(false);
    expect(result.metadata.playwrightCalled).toBe(false);
    expect(result.metadata.browserApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
  });

  it("reset clears snapshot", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { browserRuntimeEnabled: true } });
    await adapter.execute(validRequest);
    adapter.reset();
    const snapshot = adapter.getSnapshot();
    expect(snapshot.executionCount).toBe(0);
    expect(snapshot.lastRequest).toBeUndefined();
    expect(snapshot.lastResult).toBeUndefined();
  });
});
