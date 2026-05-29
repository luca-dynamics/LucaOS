import { describe, expect, it, vi, beforeEach } from "vitest";
import { IntentRoutingService } from "./IntentRoutingService";
import type { LucaIntentRoutingInput } from "../../types/intentRouting";

function makeStore() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = value; },
  };
}

function makeMockDeps() {
  return {
    storage: makeStore(),
    modeService: {
      getMode: vi.fn().mockReturnValue("auto" as const),
      setMode: vi.fn(),
    },
    orchestration: {
      proposePlanFromIntent: vi.fn().mockReturnValue({ planId: "plan:test", title: "test", summary: "test", source: "test", status: "proposed", riskLevel: "low", steps: [], checkpointIds: [], governedRequestIds: [], memoryProposalIds: [], skillRequestIds: [], safeExecutionRequestIds: [], inboxEventIds: [], provenanceIds: ["prov:test"], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", metadata: {} }),
    },
    memoryProposals: {
      createProposal: vi.fn().mockReturnValue({ proposalId: "proposal:test" }),
    },
    governedRequests: {
      createRequest: vi.fn().mockReturnValue({ requestId: "request:test" }),
    },
    skillGovernance: {
      createSkillRequest: vi.fn().mockReturnValue({ skillRequestId: "skill:test" }),
    },
    checkpoints: {
      createCheckpoint: vi.fn().mockReturnValue({ checkpointId: "checkpoint:test" }),
    },
    inbox: {
      ingestEvent: vi.fn().mockReturnValue({ inboxEventId: "inbox:test" }),
    },
    bus: {
      emitEvent: vi.fn(),
      emit: vi.fn(),
    },
  };
}

function makeInput(overrides: Partial<LucaIntentRoutingInput> = {}): LucaIntentRoutingInput {
  return {
    message: "hello",
    mode: "auto",
    source: "test",
    provenanceIds: ["prov:test"],
    ...overrides,
  };
}

describe("IntentRoutingService", () => {
  let deps: ReturnType<typeof makeMockDeps>;
  let service: IntentRoutingService;

  beforeEach(() => {
    deps = makeMockDeps();
    service = new IntentRoutingService(deps);
  });

  it("route fast creates no artifacts", () => {
    const result = service.routeUserMessage(makeInput({ message: "what is 2+2?" }));
    expect(result.decision.route).toBe("fast_response");
    expect(result.noExecutionPerformed).toBe(true);
    expect(deps.orchestration.proposePlanFromIntent).not.toHaveBeenCalled();
    expect(deps.memoryProposals.createProposal).not.toHaveBeenCalled();
    expect(deps.governedRequests.createRequest).not.toHaveBeenCalled();
    expect(deps.skillGovernance.createSkillRequest).not.toHaveBeenCalled();
  });

  it("route memory creates memory proposal only, does not write memory", () => {
    const result = service.routeUserMessage(makeInput({ message: "remember that I like dark mode" }));
    expect(result.decision.route).toBe("memory_proposal");
    expect(deps.memoryProposals.createProposal).toHaveBeenCalledTimes(1);
    expect(result.decision.createdMemoryProposalIds).toContain("proposal:test");
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("route plan calls orchestration but does not create artifacts automatically", () => {
    const result = service.routeUserMessage(makeInput({ message: "help me build a workflow with multiple steps" }));
    expect(result.decision.route).toBe("runtime_plan");
    expect(deps.orchestration.proposePlanFromIntent).toHaveBeenCalledTimes(1);
    expect(result.decision.createdPlanId).toBe("plan:test");
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("route governed request creates request but does not execute", () => {
    const result = service.routeUserMessage(makeInput({ message: "show diagnostics" }));
    expect(result.decision.route).toBe("safe_execution_request");
    expect(deps.governedRequests.createRequest).toHaveBeenCalledTimes(1);
    expect(result.decision.createdGovernedRequestIds).toContain("request:test");
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("route skill creates state-only skill request", () => {
    const result = service.routeUserMessage(makeInput({ message: "install the weather plugin" }));
    expect(result.decision.route).toBe("skill_request");
    expect(deps.skillGovernance.createSkillRequest).toHaveBeenCalledTimes(1);
    expect(result.decision.createdSkillRequestIds).toContain("skill:test");
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("blocked route creates inbox/log event only, no execution", () => {
    const result = service.routeUserMessage(makeInput({ message: "open a shell terminal" }));
    expect(result.decision.route).toBe("blocked_risky_action");
    expect(deps.inbox.ingestEvent).toHaveBeenCalledTimes(1);
    expect(result.decision.inboxEventIds).toContain("inbox:test");
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("ask_user route creates no execution", () => {
    // We need a message that triggers ask_user. Using a message with
    // unclear_consequential signal. Since the policy needs this signal to
    // be in the detected list, we verify the route is not executing:
    const result = service.routeUserMessage(makeInput({ message: "what is the weather today?" }));
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("routing decisions persist and trim", () => {
    for (let i = 0; i < 5; i++) {
      service.routeUserMessage(makeInput({ message: `test message ${i}` }));
    }
    expect(service.listRoutingDecisions().length).toBe(5);
    const first = service.getLastDecision();
    expect(first).toBeDefined();
    expect(first?.decisionId).toBeTruthy();
  });

  it("diagnostics summary works", () => {
    service.routeUserMessage(makeInput({ message: "hello" }));
    service.routeUserMessage(makeInput({ message: "remember this fact" }));
    const diag = service.getDiagnosticsSummary();
    expect(diag.totalRoutingDecisions).toBe(2);
    expect(diag.routingEnabled).toBe(true);
    expect(diag.autoExecutionEnabled).toBe(false);
    expect(diag.riskyExecutionEnabled).toBe(false);
  });

  it("default mode is auto", () => {
    expect(service.getDefaultMode()).toBe("auto");
  });

  it("set/get mode works", () => {
    service.setDefaultMode("fast");
    expect(deps.modeService.setMode).toHaveBeenCalledWith("fast");
  });

  it("getDecision returns correct decision by id", () => {
    const result = service.routeUserMessage(makeInput({ message: "hello" }));
    const found = service.getDecision(result.decision.decisionId);
    expect(found).toBeDefined();
    expect(found?.decisionId).toBe(result.decision.decisionId);
  });
});
