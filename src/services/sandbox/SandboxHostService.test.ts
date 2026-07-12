import { describe, expect, it } from "vitest";
import { SandboxHostService, type SandboxBackendAdapter } from "./SandboxHostService";

const adapter = (
  kind: SandboxBackendAdapter["kind"],
  available: boolean,
  capabilities: Array<"browser" | "terminal" | "workspace_read" | "workspace_write" | "network" | "secrets">,
  isolated = true,
): SandboxBackendAdapter => ({
  kind,
  async probe() {
    return { backend: kind, available, isolated, reason: available ? "ready" : "not installed", capabilities };
  },
});

describe("SandboxHostService", () => {
  it("selects the first isolated backend that satisfies every capability", async () => {
    const service = new SandboxHostService([
      adapter("docker", false, []),
      adapter("wsl2", true, ["browser", "terminal", "workspace_read"]),
    ]);

    const plan = await service.planSession({
      missionId: "mission-1",
      persistence: "ephemeral",
      capabilities: ["browser", "terminal"],
    });

    expect(plan.status).toBe("ready");
    expect(plan.backend).toBe("wsl2");
    expect(plan.hostFallbackAllowed).toBe(false);
  });

  it("fails closed when no real isolation backend is available", async () => {
    const service = new SandboxHostService([
      adapter("docker", true, ["terminal"], false),
    ]);

    const plan = await service.planSession({
      missionId: "mission-2",
      persistence: "ephemeral",
      capabilities: ["terminal"],
    });

    expect(plan).toMatchObject({ status: "blocked", backend: null, hostFallbackAllowed: false });
  });

  it("requires explicit scope for persistence and secrets", async () => {
    const service = new SandboxHostService([
      adapter("remote", true, ["terminal", "secrets"]),
    ]);

    const plan = await service.planSession({
      missionId: "mission-3",
      persistence: "persistent",
      capabilities: ["terminal", "secrets"],
    });

    expect(plan.status).toBe("blocked");
    expect(plan.blockers).toHaveLength(2);
  });

  it("turns backend probe errors into unavailable results", async () => {
    const service = new SandboxHostService([{
      kind: "docker",
      async probe() { throw new Error("daemon unavailable"); },
    }]);

    await expect(service.probeBackends()).resolves.toEqual([
      expect.objectContaining({ backend: "docker", available: false, isolated: false, reason: "daemon unavailable" }),
    ]);
  });
});

