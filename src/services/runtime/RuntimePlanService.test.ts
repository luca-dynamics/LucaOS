import { describe, expect, it, vi } from "vitest";
import { RuntimePlanService, type CreatePlanInput } from "./RuntimePlanService";
import type { StepDraft } from "./RuntimePlanPolicy";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createStack() {
  const storage = new MemoryStorage();
  const inbox = { ingestEvent: vi.fn((event: unknown) => ({ inboxEventId: `inbox:${Math.random()}`, ...(event as Record<string, unknown>) } as never)) };
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const checkpoints = { createCheckpoint: vi.fn((input: unknown) => ({ checkpointId: `ckpt:${Math.random()}`, ...(input as Record<string, unknown>) })) };
  const governedRequests = { createRequest: vi.fn((input: unknown) => ({ requestId: `req:${Math.random()}`, ...(input as Record<string, unknown>) })) };
  const memoryProposals = { createProposal: vi.fn((input: unknown) => ({ proposalId: `prop:${Math.random()}`, ...(input as Record<string, unknown>) })) };
  const skillGovernance = { createSkillRequest: vi.fn((input: unknown) => ({ skillRequestId: `skill:${Math.random()}`, ...(input as Record<string, unknown>) })) };
  const service = new RuntimePlanService({ storage, inbox, bus, checkpoints, governedRequests, memoryProposals, skillGovernance });
  return { storage, inbox, bus, checkpoints, governedRequests, memoryProposals, skillGovernance, service };
}

const PROV_IDS = ["prov:test:001"];

function basePlanInput(stepDrafts: StepDraft[] = [{ title: "Explain something", summary: "Explain the approach" }]): CreatePlanInput {
  return {
    title: "Test Plan",
    summary: "A plan for testing",
    source: "test",
    provenanceIds: PROV_IDS,
    stepDrafts,
  };
}

describe("RuntimePlanService", () => {
  it("requires provenance to create a plan", () => {
    const { service } = createStack();
    expect(() => service.createPlan({ ...basePlanInput(), provenanceIds: [] })).toThrow("provenance");
  });

  it("creates a sanitized plan", () => {
    const { service } = createStack();
    const plan = service.createPlan(basePlanInput());
    expect(plan.planId).toContain("runtime-plan:");
    expect(plan.status).toBe("proposed");
    expect(plan.steps.length).toBe(1);
    expect(plan.provenanceIds).toEqual(PROV_IDS);
  });

  it("creates a checkpoint for multi-step or elevated-risk plan", () => {
    const { service, checkpoints } = createStack();
    const steps: StepDraft[] = [
      { title: "Step 1", summary: "First step" },
      { title: "Step 2", summary: "Second step" },
    ];
    service.createPlan(basePlanInput(steps));
    expect(checkpoints.createCheckpoint).toHaveBeenCalled();
  });

  it("does not execute actions when creating a plan", () => {
    const { service, governedRequests, memoryProposals, skillGovernance } = createStack();
    service.createPlan(basePlanInput());
    expect(governedRequests.createRequest).not.toHaveBeenCalled();
    expect(memoryProposals.createProposal).not.toHaveBeenCalled();
    expect(skillGovernance.createSkillRequest).not.toHaveBeenCalled();
  });

  it("does not write memory when creating a plan", () => {
    const { service, memoryProposals } = createStack();
    const steps: StepDraft[] = [{ title: "Remember this", summary: "Save this user fact about preferences" }];
    service.createPlan(basePlanInput(steps));
    expect(memoryProposals.createProposal).not.toHaveBeenCalled();
  });

  it("createArtifactsForPlan creates memory proposals without writing", () => {
    const { service, memoryProposals } = createStack();
    const steps: StepDraft[] = [{ title: "Remember my name", summary: "Save this user fact" }];
    const plan = service.createPlan(basePlanInput(steps));
    service.createArtifactsForPlan(plan.planId);
    expect(memoryProposals.createProposal).toHaveBeenCalled();
    const callArgs = memoryProposals.createProposal.mock.calls[0][0];
    expect(callArgs.title).toContain("Remember my name");
  });

  it("createArtifactsForPlan creates skill request without installing/running", () => {
    const { service, skillGovernance } = createStack();
    const steps: StepDraft[] = [{ title: "Enable the extension plugin", summary: "Enable the weather skill" }];
    const plan = service.createPlan(basePlanInput(steps));
    service.createArtifactsForPlan(plan.planId);
    expect(skillGovernance.createSkillRequest).toHaveBeenCalled();
  });

  it("createArtifactsForPlan creates governed request without executing", () => {
    const { service, governedRequests } = createStack();
    const steps: StepDraft[] = [{ title: "Show notification", summary: "Display a notification to the user", suggestedKind: "safe_execution_request" }];
    const plan = service.createPlan(basePlanInput(steps));
    service.createArtifactsForPlan(plan.planId);
    expect(governedRequests.createRequest).toHaveBeenCalled();
  });

  it("artifact creation is idempotent", () => {
    const { service, memoryProposals } = createStack();
    const steps: StepDraft[] = [{ title: "Remember my name", summary: "Save this user fact" }];
    const plan = service.createPlan(basePlanInput(steps));
    service.createArtifactsForPlan(plan.planId);
    service.createArtifactsForPlan(plan.planId);
    expect(memoryProposals.createProposal).toHaveBeenCalledTimes(1);
  });

  it("blocked risky step remains blocked", () => {
    const { service } = createStack();
    const steps: StepDraft[] = [{ title: "Run shell command", summary: "Execute sudo rm -rf in terminal" }];
    const plan = service.createPlan(basePlanInput(steps));
    expect(plan.steps[0].kind).toBe("blocked_risky_action");
    expect(plan.steps[0].status).toBe("blocked");
    service.createArtifactsForPlan(plan.planId);
    const updated = service.getPlan(plan.planId);
    expect(updated?.steps[0].status).toBe("blocked");
  });

  it("diagnostics summary works", () => {
    const { service } = createStack();
    service.createPlan(basePlanInput());
    const summary = service.getDiagnosticsSummary();
    expect(summary.totalPlans).toBe(1);
    expect(summary.proposedPlans).toBe(1);
    expect(summary.orchestrationEnabled).toBe(true);
    expect(summary.riskyExecutionEnabled).toBe(false);
  });

  it("plan lifecycle: activate, complete, archive", () => {
    const { service } = createStack();
    const plan = service.createPlan(basePlanInput());
    expect(service.activatePlan(plan.planId)?.status).toBe("active");
    expect(service.getActivePlan()?.planId).toBe(plan.planId);
    expect(service.completePlan(plan.planId)?.status).toBe("completed");
    expect(service.archivePlan(plan.planId)?.status).toBe("archived");
  });

  it("plan lifecycle: reject and block", () => {
    const { service } = createStack();
    const plan = service.createPlan(basePlanInput());
    expect(service.rejectPlan(plan.planId)?.status).toBe("rejected");
    const plan2 = service.createPlan(basePlanInput());
    expect(service.blockPlan(plan2.planId, "manual block")?.status).toBe("blocked");
    expect(service.blockPlan(plan2.planId, "manual block")?.blockedBy).toContain("manual block");
  });

  it("blocks plan creation when input contains secrets", () => {
    const { service } = createStack();
    expect(() =>
      service.createPlan({
        ...basePlanInput(),
        title: "Store sk-secretkey12345678",
      }),
    ).toThrow("blocked");
  });

  it("creates inbox events for plan lifecycle events", () => {
    const { service, inbox } = createStack();
    const plan = service.createPlan(basePlanInput());
    expect(inbox.ingestEvent).toHaveBeenCalled();
    service.activatePlan(plan.planId);
    service.completePlan(plan.planId);
    expect(inbox.ingestEvent.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("createArtifactsForPlan is idempotent for explain steps", () => {
    const { service, inbox } = createStack();
    const steps: StepDraft[] = [{ title: "Explain approach", summary: "Describe the plan", suggestedKind: "explain" }];
    const plan = service.createPlan(basePlanInput(steps));
    const callsBefore = inbox.ingestEvent.mock.calls.length;
    service.createArtifactsForPlan(plan.planId);
    const callsAfterFirst = inbox.ingestEvent.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(callsBefore);
    service.createArtifactsForPlan(plan.planId);
    const callsAfterSecond = inbox.ingestEvent.mock.calls.length;
    expect(callsAfterSecond).toBe(callsAfterFirst);
  });

  it("createArtifactsForPlan is idempotent for ask_user steps", () => {
    const { service, inbox } = createStack();
    const steps: StepDraft[] = [{ title: "Ask user preference", summary: "What color do you prefer?", suggestedKind: "ask_user" }];
    const plan = service.createPlan(basePlanInput(steps));
    const callsBefore = inbox.ingestEvent.mock.calls.length;
    service.createArtifactsForPlan(plan.planId);
    const callsAfterFirst = inbox.ingestEvent.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(callsBefore);
    service.createArtifactsForPlan(plan.planId);
    expect(inbox.ingestEvent.mock.calls.length).toBe(callsAfterFirst);
  });

  it("createArtifactsForPlan is idempotent for inbox_event steps", () => {
    const { service, inbox } = createStack();
    const steps: StepDraft[] = [{ title: "Log event", summary: "Create an inbox event", suggestedKind: "inbox_event" }];
    const plan = service.createPlan(basePlanInput(steps));
    const callsBefore = inbox.ingestEvent.mock.calls.length;
    service.createArtifactsForPlan(plan.planId);
    const callsAfterFirst = inbox.ingestEvent.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(callsBefore);
    service.createArtifactsForPlan(plan.planId);
    expect(inbox.ingestEvent.mock.calls.length).toBe(callsAfterFirst);
  });

  it("createArtifactsForPlan is idempotent for other steps", () => {
    const { service, inbox } = createStack();
    const steps: StepDraft[] = [{ title: "Misc action", summary: "Some other step", suggestedKind: "other" }];
    const plan = service.createPlan(basePlanInput(steps));
    const callsBefore = inbox.ingestEvent.mock.calls.length;
    service.createArtifactsForPlan(plan.planId);
    const callsAfterFirst = inbox.ingestEvent.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(callsBefore);
    service.createArtifactsForPlan(plan.planId);
    expect(inbox.ingestEvent.mock.calls.length).toBe(callsAfterFirst);
  });

  it("explain/ask_user steps are not logged as blocked", () => {
    const { service, inbox } = createStack();
    const steps: StepDraft[] = [
      { title: "Explain approach", summary: "Describe the plan", suggestedKind: "explain" },
      { title: "Ask user preference", summary: "What color?", suggestedKind: "ask_user" },
    ];
    const plan = service.createPlan(basePlanInput(steps));
    service.createArtifactsForPlan(plan.planId);
    const eventTypes = inbox.ingestEvent.mock.calls.map((call: unknown[]) => (call[0] as Record<string, unknown>).eventType);
    expect(eventTypes).not.toContain("runtime_plan_step_blocked");
    expect(eventTypes).toContain("runtime_plan_step_notice");
    expect(eventTypes).toContain("runtime_plan_step_waiting_user");
  });

  it("explain step gets completed status, ask_user gets waiting_user status, reminder gets proposed", () => {
    const { service } = createStack();
    const steps: StepDraft[] = [
      { title: "Explain approach", summary: "Describe the plan", suggestedKind: "explain" },
      { title: "Ask user preference", summary: "What color?", suggestedKind: "ask_user" },
      { title: "Set a reminder", summary: "Reminder for later", suggestedKind: "reminder" },
    ];
    const plan = service.createPlan(basePlanInput(steps));
    service.createArtifactsForPlan(plan.planId);
    const updated = service.getPlan(plan.planId);
    expect(updated?.steps[0].status).toBe("completed");
    expect(updated?.steps[1].status).toBe("waiting_user");
    expect(updated?.steps[2].status).toBe("proposed");
  });

  it("explain/ask_user steps get relatedInboxEventId set", () => {
    const { service } = createStack();
    const steps: StepDraft[] = [
      { title: "Explain approach", summary: "Describe the plan", suggestedKind: "explain" },
      { title: "Ask user preference", summary: "What color?", suggestedKind: "ask_user" },
    ];
    const plan = service.createPlan(basePlanInput(steps));
    service.createArtifactsForPlan(plan.planId);
    const updated = service.getPlan(plan.planId);
    expect(updated?.steps[0].relatedInboxEventId).toBeDefined();
    expect(updated?.steps[1].relatedInboxEventId).toBeDefined();
  });
});
