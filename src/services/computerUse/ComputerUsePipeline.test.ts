import { describe, expect, it, vi } from "vitest";
import { ComputerUseActionPlanner } from "./ComputerUseActionPlanner";
import { ComputerUseExecutor } from "./ComputerUseExecutor";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";
import { ComputerUseGuardBridge } from "./ComputerUseGuardBridge";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import { ComputerUsePipeline } from "./ComputerUsePipeline";
import { ComputerUseRecovery } from "./ComputerUseRecovery";
import { ComputerUseSandboxExecutorAdapter } from "./ComputerUseSandboxExecutorAdapter";
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
    expect(result.recoveryPlan.strategy).toBe("request_guard_approval");
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



  it("uses execution result metadata.executionMode for recovery when request mode is undefined", async () => {
    const adapterExecutor = new ComputerUseExecutor();
    adapterExecutor.registerAdapter({
      id: "direct-click",
      mode: "direct_host",
      supportedActionTypes: ["click"],
      execute: async (action) => ({
        status: "failed",
        action,
        metadata: {
          reason: "Adapter simulated failure",
          adapterId: "direct-click",
          systemApisCalled: false,
          delegatesOnly: true,
          noDirectSystemCalls: true,
          executorKind: "scaffold",
        },
      }),
    });

    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder(),
      actionPlanner: new ComputerUseActionPlanner(),
      executor: adapterExecutor,
      verifier: new ComputerUseVerifier(),
      recovery: new ComputerUseRecovery(),
      tapeBridge: new ComputerUseMissionTapeBridge(),
    });

    const result = await pipeline.run({
      missionId: "mission-8",
      userPointedTarget: { description: "Primary action" },
    });

    expect(result.executionResults[0].metadata?.executionMode).toBe("direct_host");
    expect(result.recoveryPlan.strategy).toBe("retry_sandbox");
  });

  it("metadata says systemApisCalled false", async () => {
    const { pipeline } = createPipeline();

    const result = await pipeline.run({ missionId: "mission-7", userPointedTarget: { description: "Submit" } });

    expect(result.metadata.pipelineKind).toBe("scaffold");
    expect(result.metadata.systemApisCalled).toBe(false);
  });

  it("guard bridge requires confirmation before executor runs", async () => {
    const executor = new ComputerUseExecutor();
    const sandboxAdapter = new ComputerUseSandboxExecutorAdapter();
    const sandboxExecuteSpy = vi.spyOn(sandboxAdapter, "execute");
    executor.registerAdapter(sandboxAdapter);
    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" }),
      actionPlanner: new ComputerUseActionPlanner(),
      executor,
      guardBridge: new ComputerUseGuardBridge(),
      verifier: new ComputerUseVerifier(),
      recovery: new ComputerUseRecovery(),
      tapeBridge: new ComputerUseMissionTapeBridge(),
    });

    const result = await pipeline.run({
      missionId: "mission-guard-1",
      userPointedTarget: { description: "Delete item" },
      executionRequest: { guardApprovalProvided: false },
    });

    expect(result.executionResults[0].status).toBe("denied");
    expect(result.executionResults[0].metadata?.reason).toContain("Guard approval");
    expect(result.executionResults[0].metadata?.guardDecisionStatus).toBe("needs_confirmation");
    expect(result.executionResults[0].metadata?.externalGuardCalled).toBe(false);
    expect(sandboxExecuteSpy).not.toHaveBeenCalled();
  });

  it("guard allowed lets sandbox adapter execute", async () => {
    const executor = new ComputerUseExecutor();
    executor.registerAdapter(new ComputerUseSandboxExecutorAdapter());
    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" }),
      actionPlanner: new ComputerUseActionPlanner(),
      executor,
      guardBridge: new ComputerUseGuardBridge(),
      verifier: new ComputerUseVerifier(),
      recovery: new ComputerUseRecovery(),
      tapeBridge: new ComputerUseMissionTapeBridge(),
    });
    const result = await pipeline.run({
      missionId: "mission-guard-2",
      userPointedTarget: { description: "Confirm" },
      executionRequest: { guardApprovalProvided: true },
    });
    expect(result.executionResults[0].status).toBe("executed");
    expect(result.executionResults[0].metadata?.executionMode).toBe("sandbox");
  });

  it("sandbox adapter execution records lifecycle tape events", async () => {
    const executor = new ComputerUseExecutor();
    executor.registerAdapter(new ComputerUseSandboxExecutorAdapter());
    const tapeBridge = new ComputerUseMissionTapeBridge();
    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" }),
      actionPlanner: new ComputerUseActionPlanner(),
      executor,
      guardBridge: new ComputerUseGuardBridge(),
      verifier: new ComputerUseVerifier(),
      recovery: new ComputerUseRecovery(),
      tapeBridge,
    });
    await pipeline.run({
      missionId: "mission-guard-3",
      userPointedTarget: { description: "Submit form" },
      executionRequest: { guardApprovalProvided: true },
    });

    const eventTypes = tapeBridge.listEvents("mission-guard-3").map((event) => event.eventType);
    expect(eventTypes).toEqual([
      "focus_context",
      "action_plan",
      "execution_result",
      "verification_result",
      "recovery_plan",
    ]);
  });

  it("dangerous context with no actionable target keeps observe-only flow", async () => {
    const executor = new ComputerUseExecutor();
    executor.registerAdapter(new ComputerUseSandboxExecutorAdapter());
    const pipeline = new ComputerUsePipeline({
      focusContextBuilder: new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" }),
      actionPlanner: new ComputerUseActionPlanner(),
      executor,
      guardBridge: new ComputerUseGuardBridge(),
      verifier: new ComputerUseVerifier(),
      recovery: new ComputerUseRecovery(),
      tapeBridge: new ComputerUseMissionTapeBridge(),
    });

    const result = await pipeline.run({
      missionId: "mission-guard-4",
      executionRequest: { guardApprovalProvided: false },
    });

    expect(result.actionPlan.actions[0].type).toBe("observe");
    expect(result.executionResults[0].status).toBe("skipped");
    expect(result.verificationResults[0].status).toBe("inconclusive");
    expect(result.recoveryPlan.strategy).toBe("observe_again");
  });
});
