import { describe, expect, it } from "vitest";
import { BrowserRuntimeRouter } from "./BrowserRuntimeRouter";
import {
  BrowserRuntimeAdapter,
  BrowserRuntimeLane,
  BrowserRuntimeLaneProvider,
  BrowserRuntimeRequest,
  BrowserRuntimeRouteResult,
} from "./types";

const baseRequest: BrowserRuntimeRequest = {
  requestId: "req-001",
  missionId: "mission-001",
  action: "navigate",
  target: "https://example.com",
  issuedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  riskLevel: "safe",
  trustTier: "trusted",
  hasGuardApproval: false,
};

const createAdapter = (lane: BrowserRuntimeLane): BrowserRuntimeAdapter => ({
  lane,
  canHandle: () => true,
  execute: async (request): Promise<BrowserRuntimeRouteResult> => ({
    accepted: true,
    lane,
    runtime: lane === "authenticated_direct_host" ? "bidi" : "playwright",
    reason: `routed:${request.requestId}`,
  }),
});

const safeProvider: BrowserRuntimeLaneProvider = {
  lane: "ghost_browser",
  canProvide: (request) => request.riskLevel === "safe",
};

describe("BrowserRuntimeRouter", () => {
  it("safe trusted task routes to ghost browser by default", async () => {
    const router = new BrowserRuntimeRouter(
      [createAdapter("ghost_browser"), createAdapter("sandbox_browser")],
      [safeProvider],
    );

    const result = await router.route(baseRequest);

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("ghost_browser");
  });

  it("dangerous task without approval is denied/requires approval", async () => {
    const router = new BrowserRuntimeRouter([createAdapter("ghost_browser")], [safeProvider]);

    const result = await router.route({ ...baseRequest, riskLevel: "dangerous" });

    expect(result.accepted).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.lane).toBe("unknown");
  });

  it("untrusted task prefers sandbox", async () => {
    const router = new BrowserRuntimeRouter(
      [createAdapter("ghost_browser"), createAdapter("sandbox_browser")],
      [safeProvider],
    );

    const result = await router.route({ ...baseRequest, trustTier: "untrusted" });

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("sandbox_browser");
  });

  it("untrusted + preferred remote linked still routes to sandbox", async () => {
    const router = new BrowserRuntimeRouter(
      [createAdapter("sandbox_browser"), createAdapter("remote_linked_browser")],
      [safeProvider],
    );

    const result = await router.route({
      ...baseRequest,
      trustTier: "untrusted",
      preferredLane: "remote_linked_browser",
      linkedDeviceTrusted: true,
      linkedDeviceAvailable: true,
    });

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("sandbox_browser");
  });

  it("authenticated direct host requires trusted + approval", async () => {
    const router = new BrowserRuntimeRouter([createAdapter("authenticated_direct_host")]);

    const denied = await router.route({
      ...baseRequest,
      preferredLane: "authenticated_direct_host",
      hasGuardApproval: false,
    });

    const allowed = await router.route({
      ...baseRequest,
      preferredLane: "authenticated_direct_host",
      hasGuardApproval: true,
    });

    expect(denied.accepted).toBe(false);
    expect(denied.lane).toBe("unknown");
    expect(allowed.accepted).toBe(true);
    expect(allowed.lane).toBe("authenticated_direct_host");
  });

  it("linked-device route only works when trusted and available", async () => {
    const router = new BrowserRuntimeRouter([createAdapter("remote_linked_browser")]);

    const denied = await router.route({
      ...baseRequest,
      preferredLane: "remote_linked_browser",
      linkedDeviceTrusted: true,
      linkedDeviceAvailable: false,
    });

    const allowed = await router.route({
      ...baseRequest,
      preferredLane: "remote_linked_browser",
      linkedDeviceTrusted: true,
      linkedDeviceAvailable: true,
    });

    expect(denied.accepted).toBe(false);
    expect(denied.lane).toBe("unknown");
    expect(allowed.accepted).toBe(true);
    expect(allowed.lane).toBe("remote_linked_browser");
  });

  it("unavailable lane provider does not fallback to adapter when lane providers exist", async () => {
    const neverProvider: BrowserRuntimeLaneProvider = {
      lane: "ghost_browser",
      canProvide: () => false,
    };

    const router = new BrowserRuntimeRouter([createAdapter("ghost_browser")], [neverProvider]);

    const result = await router.route(baseRequest);

    expect(result.accepted).toBe(false);
    expect(result.lane).toBe("unknown");
  });

  it("adapter fallback works when no lane providers are configured", async () => {
    const router = new BrowserRuntimeRouter([
      createAdapter("ghost_browser"),
      createAdapter("sandbox_browser"),
    ]);

    const result = await router.route(baseRequest);

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("ghost_browser");
  });

  it("no provider returns denied unknown", async () => {
    const router = new BrowserRuntimeRouter([], [safeProvider]);

    const result = await router.route({ ...baseRequest, riskLevel: "sensitive", hasGuardApproval: true });

    expect(result.accepted).toBe(false);
    expect(result.lane).toBe("unknown");
    expect(result.runtime).toBe("unknown");
  });
});
