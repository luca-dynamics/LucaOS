import { describe, expect, it } from "vitest";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import { ComputerUsePipeline } from "./ComputerUsePipeline";

describe("ComputerUsePipeline", () => {
  it("pipeline with no adapter fails safely and creates recovery plan", async () => {
    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder({ trustTier: "trusted" }),
    });

    const result = await pipeline.run({
      missionId: "m-1",
      userPointedTarget: { description: "submit" },
    });

    expect(result.executionResults[0].status).toBe("failed");
    expect(result.recoveryPlan.strategy).toBe("retry_sandbox");
  });

  it("pipeline records all lifecycle events to tape bridge", async () => {
    const pipeline = new ComputerUsePipeline();

    const result = await pipeline.run({ missionId: "m-2" });

    expect(result.tapeRecord.events.map((event) => event.eventType)).toEqual([
      "focus_context",
      "action_plan",
      "execution_result",
      "verification_result",
      "recovery_plan",
    ]);
  });

  it("type_text payload is redacted in tape by default", async () => {
    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder(),
    });

    const result = await pipeline.run({
      missionId: "m-3",
      focusedElement: { role: "textbox", label: "message" },
      textPayload: "super secret",
    });

    const executionEvent = result.tapeRecord.events.find((event) => event.eventType === "execution_result");
    expect(executionEvent).toBeDefined();
    expect((executionEvent?.payload as { action: { text?: string } }).action.text).toBe("[REDACTED]");
  });

  it("dangerous context propagates guard approval requirement", async () => {
    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder({
        riskLevel: "dangerous",
        trustTier: "trusted",
      }),
    });

    const result = await pipeline.run({
      missionId: "m-4",
      userPointedTarget: { description: "danger click" },
    });

    expect(result.focusContext.requiresGuardApproval).toBe(true);
    expect(result.plan.requiresGuardApproval).toBe(true);
    expect(result.plan.actions[0].requiresGuardApproval).toBe(true);
    expect(result.executionResults[0].status).toBe("denied");
    expect(result.recoveryPlan.strategy).toBe("escalate_to_user");
  });

  it("observe-only plan remains non-executing", async () => {
    const pipeline = new ComputerUsePipeline();

    const result = await pipeline.run({ missionId: "m-5" });

    expect(result.plan.actions[0].type).toBe("observe");
    expect(result.executionResults[0].status).toBe("skipped");
  });

  it("reset clears pipeline/tape state", async () => {
    const tapeBridge = new ComputerUseMissionTapeBridge();
    const pipeline = new ComputerUsePipeline({ tapeBridge });

    await pipeline.run({ missionId: "m-6" });
    expect(tapeBridge.listEvents()).not.toHaveLength(0);

    pipeline.reset();

    expect(tapeBridge.listEvents()).toEqual([]);
  });

  it("metadata says systemApisCalled false", async () => {
    const pipeline = new ComputerUsePipeline();

    const result = await pipeline.run({ missionId: "m-7" });

    expect(result.metadata.pipelineKind).toBe("scaffold");
    expect(result.metadata.systemApisCalled).toBe(false);
  });
});
