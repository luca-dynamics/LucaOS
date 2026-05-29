import { describe, expect, it, vi } from "vitest";
import { ChatIntentRouterBridge } from "./ChatIntentRouterBridge";
import type { LucaIntentRoutingResult } from "../../types/intentRouting";

function makeMockResult(overrides: Partial<LucaIntentRoutingResult["decision"]> = {}): LucaIntentRoutingResult {
  return {
    decision: {
      decisionId: "test-decision",
      mode: "auto",
      route: "fast_response",
      riskLevel: "safe",
      confidence: 0.9,
      userIntentSummary: "test",
      reason: "test reason",
      signals: ["simple_chat"],
      shouldCreatePlan: false,
      shouldCreateMemoryProposal: false,
      shouldCreateGovernedRequest: false,
      shouldCreateSkillRequest: false,
      shouldCreateCheckpoint: false,
      shouldAskUser: false,
      shouldBlock: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      metadata: {},
      ...overrides,
    },
    userFacingSummary: "",
    assistantResponseHint: "respond_normally",
    createdArtifactsSummary: "none",
    noExecutionPerformed: true,
  };
}

describe("ChatIntentRouterBridge", () => {
  it("returns safe user-facing response hints", () => {
    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(makeMockResult()),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("auto" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    const result = bridge.maybeRouteMessageBeforeResponse({ message: "hello" });
    expect(result.noExecutionPerformed).toBe(true);
    expect(result.routed).toBe(false);
    expect(result.routeType).toBe("fast_response");
  });

  it("does not force every message into plan", () => {
    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(makeMockResult()),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("auto" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    const result = bridge.maybeRouteMessageBeforeResponse({ message: "what time is it?" });
    expect(result.routed).toBe(false);
    expect(result.routeType).toBe("fast_response");
  });

  it("returns routed=true for non-fast routes", () => {
    const planResult = makeMockResult({ route: "runtime_plan" });
    planResult.userFacingSummary = "Plan created";
    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(planResult),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("plan" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    const result = bridge.maybeRouteMessageBeforeResponse({ message: "help me build something" });
    expect(result.routed).toBe(true);
    expect(result.routeType).toBe("runtime_plan");
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("buildRoutingResponseHint returns empty for fast response", () => {
    const bridge = new ChatIntentRouterBridge({
      routing: { routeUserMessage: vi.fn(), getDefaultMode: vi.fn().mockReturnValue("auto" as const) },
      modeService: { getMode: vi.fn().mockReturnValue("auto" as const) },
    });

    const hint = bridge.buildRoutingResponseHint(makeMockResult());
    expect(hint).toBe("");
  });

  it("no execution methods exist on bridge", () => {
    const bridge = new ChatIntentRouterBridge({
      routing: { routeUserMessage: vi.fn(), getDefaultMode: vi.fn().mockReturnValue("auto" as const) },
      modeService: { getMode: vi.fn().mockReturnValue("auto" as const) },
    });

    // Verify no execute/run methods exist
    expect((bridge as any).execute).toBeUndefined();
    expect((bridge as any).run).toBeUndefined();
    expect((bridge as any).runTool).toBeUndefined();
    expect((bridge as any).executeTool).toBeUndefined();
  });
});
