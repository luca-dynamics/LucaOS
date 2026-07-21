import { describe, expect, it } from "vitest";
import { MissionEngineScaffold } from "./MissionEngineScaffold";

describe("MissionEngineScaffold", () => {
  it("runs low-risk steps and completes with verification", async () => {
    const engine = new MissionEngineScaffold();
    const result = await engine.run({
      missionId: "scaffold-ok",
      intent: "summarize notes",
      steps: [
        {
          goal: "read note",
          kind: "memory",
          riskLevel: "safe",
          expectedOutput: "note text",
        },
        {
          goal: "store summary",
          kind: "memory",
          riskLevel: "safe",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.stepsExecuted).toBe(2);
    expect(result.completionBlocked).toBe(false);

    const tape = await engine.getRecorder().getTape("scaffold-ok");
    expect(tape?.status).toBe("completed");
    expect(tape?.verification.length).toBeGreaterThan(0);
  });

  it("finalizes failed when a step fails", async () => {
    const engine = new MissionEngineScaffold();
    const result = await engine.run({
      missionId: "scaffold-fail",
      intent: "attempt work",
      steps: [
        { goal: "ok step", kind: "tool_call", riskLevel: "safe" },
        {
          goal: "bad step",
          kind: "tool_call",
          riskLevel: "safe",
          simulateSuccess: false,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
  });

  it("checkpoints before high-risk steps", async () => {
    const engine = new MissionEngineScaffold();
    const result = await engine.run({
      missionId: "scaffold-risky",
      intent: "write file carefully",
      steps: [
        {
          goal: "write path",
          kind: "filesystem",
          riskLevel: "dangerous",
          rollback: "restore backup",
        },
      ],
      verificationOverride: true,
      overrideReason: "Origin approved scaffold high-risk path.",
    });

    expect(result.checkpoints).toBeGreaterThanOrEqual(1);
    expect(engine.getCheckpoints().list("scaffold-risky").length).toBeGreaterThan(
      0,
    );
    // Override allows complete even if gates would block.
    expect(result.status).toBe("completed");
  });
});
