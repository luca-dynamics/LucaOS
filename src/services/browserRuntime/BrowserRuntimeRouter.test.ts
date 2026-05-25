import { describe, expect, it } from "vitest";
import { BrowserRuntimeRouter } from "./BrowserRuntimeRouter";
import { BrowserRuntimeProvider, BrowserRuntimeRouteRequest } from "./types";

const provider = (id: string, lane: BrowserRuntimeProvider["lane"], available = true): BrowserRuntimeProvider => ({
  id,
  lane,
  isAvailable: async () => available,
});

const baseRequest = (overrides: Partial<BrowserRuntimeRouteRequest> = {}): BrowserRuntimeRouteRequest => ({
  missionId: "m1",
  action: "navigate",
  context: {
    trustTier: "trusted",
    riskLevel: "safe",
    mode: "Tactical",
    hasGuardApproval: true,
  },
  ...overrides,
});

describe("BrowserRuntimeRouter scaffold", () => {
  it("safe trusted browser task routes to direct host or ghost browser", async () => {
    const router = new BrowserRuntimeRouter();
    router.registerProvider(provider("ghost-1", "ghost_browser"));
    router.registerProvider(provider("host-1", "direct_host_browser"));

    const decision = await router.route(baseRequest());
    expect(decision.allowed).toBe(true);
    expect(["ghost_browser", "direct_host_browser", "sandbox_browser"]).toContain(decision.lane);
  });

  it("dangerous task requires approval", async () => {
    const router = new BrowserRuntimeRouter();
    router.registerProvider(provider("sandbox-1", "sandbox_browser"));

    const decision = await router.route(baseRequest({
      context: { trustTier: "trusted", riskLevel: "dangerous", mode: "Tactical", hasGuardApproval: false },
    }));

    expect(decision.allowed).toBe(false);
    expect(decision.requiresApproval).toBe(true);
  });

  it("untrusted browser task routes to sandbox", async () => {
    const router = new BrowserRuntimeRouter();
    router.registerProvider(provider("sandbox-1", "sandbox_browser"));
    router.registerProvider(provider("host-1", "direct_host_browser"));

    const decision = await router.route(baseRequest({
      context: { trustTier: "untrusted", riskLevel: "sensitive", mode: "Core", hasGuardApproval: false },
    }));

    expect(decision.allowed).toBe(true);
    expect(decision.lane).toBe("sandbox_browser");
  });

  it("linked-device task routes only when trusted", async () => {
    const router = new BrowserRuntimeRouter();
    router.registerProvider(provider("remote-1", "remote_linked_browser"));

    const denied = await router.route(baseRequest({
      preferredLane: "remote_linked_browser",
      context: { trustTier: "verified", riskLevel: "safe", mode: "Tactical", linkedDeviceAvailable: true, linkedDeviceTrusted: true, hasGuardApproval: true },
    }));
    expect(denied.allowed).toBe(false);

    const allowed = await router.route(baseRequest({
      preferredLane: "remote_linked_browser",
      context: { trustTier: "trusted", riskLevel: "safe", mode: "Tactical", linkedDeviceAvailable: true, linkedDeviceTrusted: true, hasGuardApproval: true },
    }));
    expect(allowed.allowed).toBe(true);
    expect(allowed.lane).toBe("remote_linked_browser");
  });

  it("no provider available returns denied/no-route decision", async () => {
    const router = new BrowserRuntimeRouter();
    const decision = await router.route(baseRequest());
    expect(decision.allowed).toBe(false);
  });
});
