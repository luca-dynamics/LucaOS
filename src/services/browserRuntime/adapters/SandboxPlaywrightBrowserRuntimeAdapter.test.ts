import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouter } from "../BrowserRuntimeRouter";
import { createSandboxBrowserRuntimeRouter } from "../createSandboxBrowserRuntimeRouter";
import type { BrowserDriver, BrowserRuntimeRequest } from "../types";
import { SandboxPlaywrightBrowserRuntimeAdapter } from "./SandboxPlaywrightBrowserRuntimeAdapter";

const baseRequest = (
  overrides: Partial<BrowserRuntimeRequest> = {},
): BrowserRuntimeRequest => ({
  requestId: "req-sandbox-1",
  missionId: "mission-sandbox-1",
  action: "navigate",
  target: "https://example.com",
  issuedAt: "2026-07-21T00:00:00.000Z",
  riskLevel: "safe",
  trustTier: "untrusted",
  preferredLane: "sandbox_browser",
  hasGuardApproval: true,
  ...overrides,
});

function createMockDriver(
  overrides: Partial<BrowserDriver> = {},
): BrowserDriver {
  return {
    kind: "injected",
    navigate: vi.fn(async (url: string) => ({
      ok: true,
      reason: `navigated:${url}`,
    })),
    click: vi.fn(async (target?: string) => ({
      ok: true,
      reason: `clicked:${target ?? "default"}`,
    })),
    type: vi.fn(async (_target: string | undefined, text: string) => ({
      ok: true,
      reason: `typed:${text.length}`,
    })),
    extract: vi.fn(async () => ({
      ok: true,
      reason: "extracted",
      data: { text: "hello" },
    })),
    screenshot: vi.fn(async () => ({
      ok: true,
      reason: "screenshot",
    })),
    ...overrides,
  };
}

describe("SandboxPlaywrightBrowserRuntimeAdapter", () => {
  it("is disabled by default and does not call the driver", async () => {
    const driver = createMockDriver();
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({ driver });

    const result = await adapter.execute(baseRequest());

    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/enabled: true/i);
    expect(driver.navigate).not.toHaveBeenCalled();
    expect(result.execution?.playwrightCalled).toBe(false);
    expect(result.execution?.directHostAllowed).toBe(false);
    expect(result.execution?.systemApisCalled).toBe(false);
  });

  it("fails closed when enabled without a driver", async () => {
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({ enabled: true });

    const result = await adapter.execute(baseRequest());

    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/BrowserDriver/i);
  });

  it("executes navigate via injected driver when enabled", async () => {
    const driver = createMockDriver();
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({
      enabled: true,
      driver,
    });

    const result = await adapter.execute(baseRequest());

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("sandbox_browser");
    expect(result.runtime).toBe("playwright");
    expect(driver.navigate).toHaveBeenCalledWith("https://example.com");
    expect(result.execution?.realBrowserExecutionEnabled).toBe(true);
    expect(result.execution?.browserApisCalled).toBe(true);
    expect(result.execution?.directHostAllowed).toBe(false);
  });

  it("rejects non-http(s) navigate targets", async () => {
    const driver = createMockDriver();
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({
      enabled: true,
      driver,
    });

    const result = await adapter.execute(
      baseRequest({ target: "file:///etc/passwd" }),
    );

    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/protocol/i);
    expect(driver.navigate).not.toHaveBeenCalled();
  });

  it("requires type payload text", async () => {
    const driver = createMockDriver();
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({
      enabled: true,
      driver,
    });

    const result = await adapter.execute(
      baseRequest({ action: "type", target: "#input", payload: {} }),
    );

    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/payload\.text/i);
    expect(driver.type).not.toHaveBeenCalled();
  });

  it("types with payload.text", async () => {
    const driver = createMockDriver();
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({
      enabled: true,
      driver,
    });

    const result = await adapter.execute(
      baseRequest({
        action: "type",
        target: "#input",
        payload: { text: "hello" },
      }),
    );

    expect(result.accepted).toBe(true);
    expect(driver.type).toHaveBeenCalledWith("#input", "hello", { text: "hello" });
  });

  it("still handles requests when preferredLane hint is direct-host (router may force sandbox)", async () => {
    const driver = createMockDriver();
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({
      enabled: true,
      driver,
    });

    // preferredLane is a hint only; this adapter's lane remains sandbox_browser.
    expect(
      adapter.canHandle(
        baseRequest({ preferredLane: "authenticated_direct_host" }),
      ),
    ).toBe(true);

    const result = await adapter.execute(
      baseRequest({ preferredLane: "authenticated_direct_host" }),
    );
    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("sandbox_browser");
    expect(result.execution?.directHostAllowed).toBe(false);
    expect(driver.navigate).toHaveBeenCalled();
  });

  it("canHandle supports sandbox browser actions", () => {
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter();
    expect(adapter.canHandle(baseRequest({ action: "click" }))).toBe(true);
    expect(adapter.canHandle(baseRequest({ action: "extract" }))).toBe(true);
  });
});

describe("createSandboxBrowserRuntimeRouter", () => {
  it("routes untrusted work to the sandbox adapter when enabled", async () => {
    const driver = createMockDriver();
    const { router, sandboxAdapter } = createSandboxBrowserRuntimeRouter({
      enabled: true,
      driver,
    });

    expect(sandboxAdapter.lane).toBe("sandbox_browser");

    const result = await router.route(
      baseRequest({ trustTier: "untrusted", preferredLane: "sandbox_browser" }),
    );

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("sandbox_browser");
    expect(driver.navigate).toHaveBeenCalled();
  });

  it("does not execute when factory keeps adapter disabled", async () => {
    const driver = createMockDriver();
    const { router } = createSandboxBrowserRuntimeRouter({ driver });

    const result = await router.route(
      baseRequest({ trustTier: "untrusted", preferredLane: "sandbox_browser" }),
    );

    expect(result.accepted).toBe(false);
    expect(driver.navigate).not.toHaveBeenCalled();
  });

  it("registers with BrowserRuntimeRouter.registerAdapter path", async () => {
    const driver = createMockDriver();
    const adapter = new SandboxPlaywrightBrowserRuntimeAdapter({
      enabled: true,
      driver,
    });
    const router = new BrowserRuntimeRouter();
    router.registerAdapter(adapter);

    const result = await router.route(
      baseRequest({ trustTier: "untrusted", action: "click", target: "button" }),
    );

    expect(result.accepted).toBe(true);
    expect(driver.click).toHaveBeenCalled();
  });
});
