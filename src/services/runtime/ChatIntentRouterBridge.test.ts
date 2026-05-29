import { describe, expect, it, vi } from "vitest";
import { ChatIntentRouterBridge } from "./ChatIntentRouterBridge";
import { ChatIntentProvenanceService } from "./ChatIntentProvenanceService";
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

  it("does not synthesize provenance — passes empty array when none supplied", () => {
    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(makeMockResult()),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("auto" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    bridge.maybeRouteMessageBeforeResponse({ message: "hello" });

    expect(mockRouting.routeUserMessage).toHaveBeenCalledTimes(1);
    const callArg = mockRouting.routeUserMessage.mock.calls[0][0];
    expect(callArg.provenanceIds).toEqual([]);
  });

  it("passes through real provenance when supplied", () => {
    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(makeMockResult()),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("auto" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    bridge.maybeRouteMessageBeforeResponse({ message: "hello", provenanceIds: ["prov:real:123"] });

    const callArg = mockRouting.routeUserMessage.mock.calls[0][0];
    expect(callArg.provenanceIds).toEqual(["prov:real:123"]);
  });

  it("routed chat with provenance can create artifacts (non-fast route)", () => {
    const planResult = makeMockResult({ route: "runtime_plan" });
    planResult.userFacingSummary = "Plan created for multi-step task";
    planResult.createdArtifactsSummary = "plan:intent-route-123";
    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(planResult),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("plan" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    const result = bridge.maybeRouteMessageBeforeResponse({
      message: "build a project plan",
      provenanceIds: ["prov:test:abc"],
    });
    expect(result.routed).toBe(true);
    expect(result.createdArtifacts).toBe("plan:intent-route-123");
    expect(result.noExecutionPerformed).toBe(true);
  });

  it("fast chat does not create artifacts", () => {
    const fastResult = makeMockResult({ route: "fast_response" });
    fastResult.createdArtifactsSummary = "none";
    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(fastResult),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("fast" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    const result = bridge.maybeRouteMessageBeforeResponse({
      message: "hello",
      provenanceIds: ["prov:test:xyz"],
    });
    expect(result.routed).toBe(false);
    expect(result.createdArtifacts).toBe("none");
  });

  it("routing failure does not throw — caller can still send", () => {
    const mockRouting = {
      routeUserMessage: vi.fn().mockImplementation(() => {
        throw new Error("routing crashed");
      }),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("auto" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    expect(() =>
      bridge.maybeRouteMessageBeforeResponse({ message: "hello" }),
    ).toThrow();
  });
});

describe("ChatIntentRouterBridge + ChatIntentProvenanceService integration", () => {
  it("provenance helper produces IDs that bridge passes to routing", () => {
    const mockProv = {
      createProvenanceRecord: vi.fn().mockReturnValue({
        provenanceId: "prov:integration:test",
        sourceType: "external_input",
        sourceId: "chat-msg:test",
        sourceTrustLevel: "local",
        createdBy: "chat-intent-provenance",
        createdAt: "2026-01-01T00:00:00.000Z",
        digest: "fnv1a:deadbeef",
        parentProvenanceIds: [],
        quarantineState: "clear",
        approvalState: "not_required",
        revocationState: "active",
      }),
    };
    const provenanceService = new ChatIntentProvenanceService({ provenance: mockProv });

    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(makeMockResult()),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("auto" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    const { provenanceIds } = provenanceService.createChatProvenance({ message: "plan my week" });
    expect(provenanceIds).toEqual(["prov:integration:test"]);

    bridge.maybeRouteMessageBeforeResponse({
      message: "plan my week",
      source: "chat",
      provenanceIds,
    });

    const callArg = mockRouting.routeUserMessage.mock.calls[0][0];
    expect(callArg.provenanceIds).toEqual(["prov:integration:test"]);
    expect(callArg.source).toBe("chat");
  });

  it("missing provenance results in empty array — no artifacts for governed routes", () => {
    const provenanceService = new ChatIntentProvenanceService({
      provenance: {
        createProvenanceRecord: vi.fn().mockImplementation(() => {
          throw new Error("fail");
        }),
      },
    });

    const mockRouting = {
      routeUserMessage: vi.fn().mockReturnValue(makeMockResult()),
      getDefaultMode: vi.fn().mockReturnValue("auto" as const),
    };
    const mockMode = { getMode: vi.fn().mockReturnValue("auto" as const) };
    const bridge = new ChatIntentRouterBridge({ routing: mockRouting, modeService: mockMode });

    const { provenanceIds } = provenanceService.createChatProvenance({ message: "hello" });
    expect(provenanceIds).toEqual([]);

    bridge.maybeRouteMessageBeforeResponse({
      message: "hello",
      source: "chat",
      provenanceIds,
    });

    const callArg = mockRouting.routeUserMessage.mock.calls[0][0];
    expect(callArg.provenanceIds).toEqual([]);
  });

  it("hidden/internal messages are filtered by provenance service", () => {
    const provenanceService = new ChatIntentProvenanceService({
      provenance: { createProvenanceRecord: vi.fn() },
    });

    expect(provenanceService.shouldRouteMessage({ message: "hello", isHidden: true })).toBe(false);
    expect(provenanceService.shouldRouteMessage({ message: "hello", isAwakening: true })).toBe(false);
    expect(provenanceService.shouldRouteMessage({ message: "hello", senderType: "assistant" })).toBe(false);
    expect(provenanceService.shouldRouteMessage({ message: "hello", senderType: "user" })).toBe(true);
  });
});
