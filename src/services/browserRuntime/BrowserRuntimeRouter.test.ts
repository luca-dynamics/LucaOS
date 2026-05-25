import { describe, expect, it } from "vitest";
import { BrowserRuntimeRouter } from "./BrowserRuntimeRouter";
import {
  BrowserRouteContext,
  BrowserRuntimeLane,
  BrowserRuntimeLaneProvider,
  BrowserRuntimeRequest,
} from "./types";

const baseRequest: BrowserRuntimeRequest = {
  requestId: "req-001",
  missionId: "mission-001",
  action: "navigate",
  target: "https://example.com",
  issuedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

function provider(lane: Exclude<BrowserRuntimeLane, "unknown">): BrowserRuntimeLaneProvider {
  return {
    lane,
    isAvailable: () => true,
    route: async () => ({
      accepted: true,
      lane,
      runtime: lane,
    }),
  };
}

function unavailableProvider(lane: Exclude<BrowserRuntimeLane, "unknown">): BrowserRuntimeLaneProvider {
  return {
    lane,
    isAvailable: () => false,
    route: async () => ({
      accepted: true,
      lane,
      runtime: lane,
    }),
  };
}

describe("BrowserRuntimeRouter guard-aware lanes", () => {
  it("routes safe trusted task to ghost browser by default", async () => {
    const router = new BrowserRuntimeRouter([], [provider("ghost_browser")]);

    const result = await router.route({
      ...baseRequest,
      trustTier: "trusted",
      riskLevel: "safe",
    });

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("ghost_browser");
  });

  it("dangerous task without approval is denied and requires approval", async () => {
    const router = new BrowserRuntimeRouter([], [provider("sandbox_browser")]);

    const result = await router.route({
      ...baseRequest,
      riskLevel: "dangerous",
      hasGuardApproval: false,
    });

    expect(result.accepted).toBe(false);
    expect(result.lane).toBe("unknown");
    expect(result.requiresApproval).toBe(true);
  });

  it("untrusted task prefers sandbox browser", async () => {
    const router = new BrowserRuntimeRouter([], [provider("sandbox_browser")]);

    const result = await router.route({
      ...baseRequest,
      trustTier: "untrusted",
      riskLevel: "safe",
    });

    expect(result.accepted).toBe(true);
    expect(result.lane).toBe("sandbox_browser");
  });

  it("authenticated direct host requires trusted plus approval", async () => {
    const router = new BrowserRuntimeRouter([], [provider("direct_host_browser"), provider("sandbox_browser")]);

    const deniedDirect = await router.route({
      ...baseRequest,
      requiresAuthentication: true,
      trustTier: "verified",
      hasGuardApproval: true,
    });
    expect(deniedDirect.lane).toBe("sandbox_browser");

    const allowedDirect = await router.route({
      ...baseRequest,
      requiresAuthentication: true,
      trustTier: "trusted",
      hasGuardApproval: true,
    });
    expect(allowedDirect.lane).toBe("direct_host_browser");
  });

  it("linked device lane only works when trusted and available", async () => {
    const router = new BrowserRuntimeRouter([], [provider("remote_linked_browser")]);

    const denied = await router.route({
      ...baseRequest,
      preferredLane: "remote_linked_browser",
      linkedDeviceTrusted: true,
      linkedDeviceAvailable: false,
    });
    expect(denied.accepted).toBe(false);
    expect(denied.lane).toBe("unknown");

    const allowed = await router.route({
      ...baseRequest,
      preferredLane: "remote_linked_browser",
      linkedDeviceTrusted: true,
      linkedDeviceAvailable: true,
    });
    expect(allowed.accepted).toBe(true);
    expect(allowed.lane).toBe("remote_linked_browser");
  });

  it("returns denied unknown route when no provider exists", async () => {
    const router = new BrowserRuntimeRouter([], [unavailableProvider("ghost_browser")]);
    const result = await router.route({
      ...baseRequest,
      trustTier: "trusted",
      riskLevel: "safe",
    });

    expect(result.accepted).toBe(false);
    expect(result.lane).toBe("unknown");
    expect(result.runtime).toBe("unknown");
  });
});
