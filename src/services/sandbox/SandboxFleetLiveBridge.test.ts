import { describe, expect, it } from "vitest";
import { buildLiveFleetView } from "./SandboxFleetLiveBridge";
import bridgeSource from "./SandboxFleetLiveBridge.ts?raw";

const readyProbe = {
  backend: "docker" as const,
  available: true,
  isolated: true,
  reason: "Docker daemon is available.",
  capabilities: ["terminal", "workspace_read", "workspace_write", "network"] as Array<
    "terminal" | "workspace_read" | "workspace_write" | "network"
  >,
};

describe("buildLiveFleetView", () => {
  it("maps a ready probe and live sessions into an operator view", () => {
    const view = buildLiveFleetView({
      probe: readyProbe,
      hostPlatform: "windows",
      now: "2026-07-13T12:00:00.000Z",
      sessions: [
        {
          sessionId: "session-1",
          missionId: "mission-1",
          backend: "docker",
          status: "running",
          capabilities: ["terminal", "not-a-capability"],
          createdAt: "2026-07-13T10:00:00.000Z",
          updatedAt: "2026-07-13T11:00:00.000Z",
          expiresAt: "2026-07-13T14:00:00.000Z",
          runtime: { name: "luca-sbx-1", containerId: "abcdef1234567890" },
        },
        {
          sessionId: "session-2",
          missionId: "mission-1",
          backend: "docker",
          status: "running",
          createdAt: "2026-07-13T08:00:00.000Z",
          expiresAt: "2026-07-13T09:00:00.000Z",
        },
      ],
    });

    expect(view.hostFallbackAllowed).toBe(false);
    expect(view.backends).toHaveLength(1);
    const backend = view.backends[0];
    expect(backend.backendId).toBe("local-docker");
    expect(backend.available).toBe(true);
    expect(backend.blockedReason).toBeUndefined();
    expect(backend.activeSessions).toBe(2);
    expect(backend.remainingSlots).toBeGreaterThanOrEqual(1);
    expect(backend.isolationTier).toBe("container");
    expect(backend.guestOs).toEqual(["linux"]);

    expect(view.sessions).toHaveLength(2);
    const live = view.sessions.find((s) => s.sessionId === "session-1")!;
    expect(live.imageId).toBe("luca-sbx-1");
    expect(live.expired).toBe(false);
    expect(live.emergencyDestroyAllowed).toBe(true);
    const stale = view.sessions.find((s) => s.sessionId === "session-2")!;
    expect(stale.expired).toBe(true);
    expect(stale.needsCleanup).toBe(true);
    expect(view.cleanupCount).toBe(1);
  });

  it("surfaces the precise probe blocker when the backend is not ready", () => {
    const view = buildLiveFleetView({
      probe: {
        ...readyProbe,
        available: false,
        isolated: false,
        reason: "Docker is not installed.",
        capabilities: [],
      },
      hostPlatform: "windows",
      sessions: [],
    });

    expect(view.backends[0].available).toBe(false);
    expect(view.backends[0].blockedReason).toBe("Docker is not installed.");
    expect(view.sessions).toHaveLength(0);
    expect(view.cleanupCount).toBe(0);
  });

  it("filters unknown capabilities and normalizes unknown statuses", () => {
    const view = buildLiveFleetView({
      probe: readyProbe,
      hostPlatform: "linux",
      sessions: [
        {
          sessionId: "session-3",
          missionId: "mission-2",
          backend: "wsl2",
          status: "definitely-not-a-status",
          capabilities: ["terminal", "root_access"],
        },
      ],
    });

    const session = view.sessions[0];
    expect(session.status).toBe("running");
    expect(session.guestOs).toBe("linux");
  });
});

describe("SandboxFleetLiveBridge source safety", () => {
  it("uses only the narrow desktop sandbox bridge", () => {
    expect(bridgeSource).toContain("luca?.sandbox");
    expect(bridgeSource).not.toContain("child_process");
    expect(bridgeSource).not.toContain("host fallback is enabled");
  });
});
