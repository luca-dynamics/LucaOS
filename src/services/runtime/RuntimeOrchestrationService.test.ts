import { describe, expect, it, vi } from "vitest";
import { RuntimeOrchestrationService } from "./RuntimeOrchestrationService";
import type { RuntimePlanRecord, RuntimePlanDiagnosticsSummary } from "../../types/runtimePlan";

function makePlan(overrides: Partial<RuntimePlanRecord> = {}): RuntimePlanRecord {
  return {
    planId: `plan:${Math.random()}`,
    title: "Test Plan",
    summary: "Test summary",
    source: "test",
    status: "proposed",
    riskLevel: "low",
    steps: [],
    checkpointIds: [],
    governedRequestIds: [],
    memoryProposalIds: [],
    skillRequestIds: [],
    safeExecutionRequestIds: [],
    inboxEventIds: [],
    provenanceIds: ["prov:test"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

const DIAG_SUMMARY: RuntimePlanDiagnosticsSummary = {
  totalPlans: 1,
  activePlans: 0,
  proposedPlans: 1,
  waitingPlans: 0,
  blockedPlans: 0,
  completedPlans: 0,
  totalPlanSteps: 1,
  blockedRiskySteps: 0,
  pendingPlanApprovals: 0,
  planArtifactsCreated: 0,
  orchestrationEnabled: true,
  riskyExecutionEnabled: false,
};

function createStack() {
  const createdPlan = makePlan();
  const planService = {
    createPlan: vi.fn(() => createdPlan),
    listPlans: vi.fn(() => [createdPlan]),
    getPlan: vi.fn(() => createdPlan),
    getActivePlan: vi.fn(() => undefined),
    createArtifactsForPlan: vi.fn(() => createdPlan),
    getDiagnosticsSummary: vi.fn(() => DIAG_SUMMARY),
  };
  const service = new RuntimeOrchestrationService({ planService });
  return { planService, service, createdPlan };
}

describe("RuntimeOrchestrationService", () => {
  it("proposePlanFromIntent creates a plan and does not execute", () => {
    const { service, planService } = createStack();
    const plan = service.proposePlanFromIntent({
      userIntent: "Remember my favorite color is blue",
      source: "chat",
      provenanceIds: ["prov:test:001"],
    });
    expect(planService.createPlan).toHaveBeenCalledTimes(1);
    expect(plan).toBeDefined();
    expect(plan.planId).toBeDefined();
  });

  it("proposePlanFromObservation creates a plan", () => {
    const { service, planService } = createStack();
    const plan = service.proposePlanFromObservation({
      observationSummary: "User seems to prefer dark mode",
      source: "runtime-loop",
      provenanceIds: ["prov:test:002"],
    });
    expect(planService.createPlan).toHaveBeenCalledTimes(1);
    expect(plan).toBeDefined();
  });

  it("createGovernedItemsForPlan delegates safely", () => {
    const { service, planService, createdPlan } = createStack();
    service.createGovernedItemsForPlan(createdPlan.planId);
    expect(planService.createArtifactsForPlan).toHaveBeenCalledWith(createdPlan.planId);
  });

  it("listActiveOrWaitingPlans filters correctly", () => {
    const { service, planService } = createStack();
    planService.listPlans.mockReturnValue([
      makePlan({ status: "proposed" }),
      makePlan({ status: "active" }),
      makePlan({ status: "completed" }),
      makePlan({ status: "rejected" }),
      makePlan({ status: "waiting_approval" }),
    ]);
    const result = service.listActiveOrWaitingPlans();
    expect(result.length).toBe(3);
    expect(result.every((p) => ["proposed", "active", "waiting_approval"].includes(p.status))).toBe(true);
  });

  it("getOrchestrationDiagnostics returns correct shape", () => {
    const { service } = createStack();
    const diag = service.getOrchestrationDiagnostics();
    expect(diag.orchestrationEnabled).toBe(true);
    expect(diag.riskyExecutionEnabled).toBe(false);
    expect(diag.plans).toBeDefined();
    expect(diag.plans.totalPlans).toBe(1);
  });

  it("does not have any execution methods", () => {
    const { service } = createStack();
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
    expect(proto).not.toContain("executePlan");
    expect(proto).not.toContain("executeStep");
    expect(proto).not.toContain("runPlan");
    expect(proto).not.toContain("runStep");
    expect(proto).not.toContain("executeTool");
  });

  it("proposePlanFromIntent with suggestedSteps passes them through", () => {
    const { service, planService } = createStack();
    service.proposePlanFromIntent({
      userIntent: "Do several things",
      source: "chat",
      provenanceIds: ["prov:test:003"],
      suggestedSteps: [
        { title: "Step A", summary: "First step" },
        { title: "Step B", summary: "Second step" },
      ],
    });
    const callArgs = planService.createPlan.mock.calls[0][0];
    expect(callArgs.stepDrafts.length).toBe(2);
    expect(callArgs.stepDrafts[0].title).toBe("Step A");
  });
});
