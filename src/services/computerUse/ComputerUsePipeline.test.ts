import { describe, expect, it } from "vitest";
import { ComputerUseActionPlanner } from "./ComputerUseActionPlanner";
import { ComputerUseExecutor } from "./ComputerUseExecutor";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import { ComputerUsePipeline } from "./ComputerUsePipeline";
import { ComputerUseRecovery } from "./ComputerUseRecovery";
import { ComputerUseVerifier } from "./ComputerUseVerifier";

function createPipeline(options?: { riskLevel?: "safe" | "sensitive" | "dangerous" }) {
  const focusContextBuilder = new ComputerUseFocusContextBuilder({ riskLevel: options?.riskLevel });
  const actionPlanner = new ComputerUseActionPlanner();
  const executor = new ComputerUseExecutor();
  const verifier = new ComputerUseVerifier();
  const recovery = new ComputerUseRecovery();
  const tapeBridge = new ComputerUseMissionTapeBridge();

  return {
    pipeline: new ComputerUsePipeline({
      focusContextBuilder,
      actionPlanner,
      executor,
      verifier,
      recovery,
      tapeBridge,
    }),
    tapeBridge,
  };
}

describe("ComputerUsePipeline", () => {
  it("pipeline with no adapter fails safely and creates recovery plan", async () => {
    const { pipeline } = createPipeline();

    const result = await pipeline.run({
      missionId: "mission-1",
      userPointedTarget: { description: "Save button" },
    });

    expect(result.executionResults[0].status).toBe("failed");
    expect(result.executionResults[0].metadata?.systemApisCalled).toBe(false);
    expect(result.recoveryPlan.strategy).toBe("escalate_to_user");
  });

  it("pipeline records all lifecycle events to tape bridge", async () => {
    const { pipeline, tapeBridge } = createPipeline();

    await pipeline.run({
      missionId: "mission-2",
      userPointedTarget: { description: "Profile menu" },
    });

    const eventTypes = tapeBridge.listEvents("mission-2").map((event) => event.eventType);
    expect(eventTypes).toEqual([
      "focus_context",
      "action_plan",
      "execution_result",
      "verification_result",
      "recovery_plan",
    ]);
  });

  it("type_text payload is redacted in tape by default", async () => {
    const { pipeline, tapeBridge } = createPipeline();

    await pipeline.run({
      missionId: "mission-3",
      focusedElement: { role: "textbox", label: "Notes" },
      textPayload: "my-secret",
    });

    const actionPlanEvent = tapeBridge.listEvents("mission-3").find((event) => event.eventType === "action_plan");
    expect(actionPlanEvent).toBeDefined();
    const payload = actionPlanEvent?.payload as { actions: Array<{ text?: string }> };
    expect(payload.actions[0].text).toBe("[REDACTED]");
  });

  it("dangerous context propagates guard approval requirement", async () => {
    const { pipeline } = createPipeline({ riskLevel: "dangerous" });

    const result = await pipeline.run({
      missionId: "mission-4",
      userPointedTarget: { description: "Delete workspace" },
    });

    expect(result.focusContext.requiresGuardApproval).toBe(true);
    expect(result.actionPlan.requiresGuardApproval).toBe(true);
    expect(result.actionPlan.actions[0].requiresGuardApproval).toBe(true);
    expect(result.executionResults[0].status).toBe("denied");
    expect(result.recoveryPlan.requiresGuardApprovalRequest).toBe(true);
  });

  it("observe-only plan remains non-executing", async () => {
    const { pipeline } = createPipeline();

    const result = await pipeline.run({
      missionId: "mission-5",
    });

    expect(result.actionPlan.actions[0].type).toBe("observe");
    expect(result.executionResults[0].status).toBe("skipped");
    expect(result.verificationResults[0].status).toBe("inconclusive");
  });

  it("reset clears pipeline/tape state", async () => {
    const { pipeline, tapeBridge } = createPipeline();
    await pipeline.run({ missionId: "mission-6", userPointedTarget: { description: "Anything" } });

    pipeline.reset();

    expect(tapeBridge.listEvents()).toEqual([]);
  });

  it("metadata says systemApisCalled false", async () => {
    const { pipeline } = createPipeline();

    const result = await pipeline.run({ missionId: "mission-7", userPointedTarget: { description: "Submit" } });

    expect(result.metadata.pipelineKind).toBe("scaffold");
    expect(result.metadata.systemApisCalled).toBe(false);
  });
});
