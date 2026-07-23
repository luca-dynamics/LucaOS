import { describe, expect, it, beforeEach } from "vitest";
import { SwarmOrchestratorBridge } from "./swarmOrchestratorBridge";
import { credentialPoolService } from "../credentialPoolService";

describe("SwarmOrchestratorBridge", () => {
  let bridge: SwarmOrchestratorBridge;

  beforeEach(() => {
    bridge = new SwarmOrchestratorBridge();
    credentialPoolService.registerPool("anthropic", [
      "sk-ant-key1-swarm123",
      "sk-ant-key2-swarm123",
    ]);
  });

  it("registers and unregisters subagent workers in swarm", () => {
    const session = bridge.registerSubagent("sub-001", "TestRunner");
    expect(session.subagentId).toBe("sub-001");
    expect(session.role).toBe("TestRunner");

    const metrics1 = bridge.getActiveSwarmMetrics();
    expect(metrics1.activeSubagentsCount).toBe(1);

    bridge.unregisterSubagent("sub-001");
    const metrics2 = bridge.getActiveSwarmMetrics();
    expect(metrics2.activeSubagentsCount).toBe(0);
  });

  it("allocates isolated credential keys per subagent", async () => {
    bridge.registerSubagent("sub-001", "WorkerA");
    bridge.registerSubagent("sub-002", "WorkerB");

    const keyA = await bridge.allocateSubagentKey("sub-001", "anthropic");
    const keyB = await bridge.allocateSubagentKey("sub-002", "anthropic");

    expect(keyA).toBe("sk-ant-key1-swarm123");
    expect(keyB).toBe("sk-ant-key1-swarm123");
  });

  it("handles subagent rate-limit rotation without interrupting peer subagents", async () => {
    bridge.registerSubagent("sub-001", "WorkerA");

    const key1 = await bridge.allocateSubagentKey("sub-001", "anthropic");
    expect(key1).toBe("sk-ant-key1-swarm123");

    // WorkerA hits rate limit
    const rotatedKey = await bridge.reportSubagentRateLimit("sub-001", "anthropic", key1!);
    expect(rotatedKey).toBe("sk-ant-key2-swarm123");
  });

  it("broadcasts and shares verification evidence across subagent workers", async () => {
    bridge.registerSubagent("sub-001", "WorkerA");
    bridge.registerSubagent("sub-002", "WorkerB");

    // WorkerA completes test suite and broadcasts evidence
    await bridge.broadcastEvidence(
      "sub-001",
      "npm test",
      true,
      0,
      "Passed 10/10 tests",
      "src/core"
    );

    // WorkerB checks swarm evidence before running test suite
    const evidence = await bridge.checkSwarmEvidence("npm test");
    expect(evidence.isCached).toBe(true);
    expect(evidence.proof?.passed).toBe(true);
    expect(evidence.proof?.missionId).toBe("sub-001");
  });

  it("returns active swarm metrics telemetry", () => {
    bridge.registerSubagent("sub-001", "Researcher");
    const metrics = bridge.getActiveSwarmMetrics();

    expect(metrics.activeSubagentsCount).toBe(1);
    expect(metrics.subagents[0].role).toBe("Researcher");
  });
});
