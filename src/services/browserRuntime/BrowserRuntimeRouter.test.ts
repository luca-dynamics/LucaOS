import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouter } from "./BrowserRuntimeRouter";
 main
  requestId: "req-001",
  missionId: "mission-001",
  action: "navigate",
  target: "https://example.com",
  issuedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

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

  it("untrusted preferred remote linked still routes to sandbox", async () => {
    const router = new BrowserRuntimeRouter([], [provider("sandbox_browser"), provider("remote_linked_browser")]);

    const result = await router.route({
      ...baseRequest,
      trustTier: "untrusted",
      riskLevel: "safe",
      preferredLane: "remote_linked_browser",
      linkedDeviceTrusted: true,
      linkedDeviceAvailable: true,
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

  it("lane provider unavailable does not fallback to adapter when lane providers exist", async () => {
    const adapterExecute = vi.fn(async () => ({
      accepted: true,
      lane: "custom" as const,
      runtime: "custom" as const,
    }));

    const adapter: BrowserRuntimeAdapter = {
      canHandle: () => true,
      execute: adapterExecute,
    };

    const router = new BrowserRuntimeRouter([adapter], [unavailableProvider("ghost_browser")]);
    const result = await router.route({
      ...baseRequest,
      trustTier: "trusted",
      riskLevel: "safe",
    });

    expect(result.accepted).toBe(false);
    expect(result.lane).toBe("unknown");
    expect(adapterExecute).not.toHaveBeenCalled();
  });

  it("adapter fallback works when no lane providers are configured", async () => {
    const adapter: BrowserRuntimeAdapter = {
      canHandle: () => true,
      execute: async () => ({
        accepted: true,
        lane: "custom",
        
    expect(result.runtime).toBe("unknown");
  });
});
