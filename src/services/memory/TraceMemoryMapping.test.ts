import { describe, expect, it } from "vitest";
import {
  inferTraceMemorySourceKind,
  mapMissionTapeStepToLucaMemoryItem,
  mapMissionTapeToLucaMemoryItems,
  mapTraceToLucaMemoryItem,
} from "./TraceMemoryMapping";

describe("TraceMemoryMapping", () => {
  it("maps mission tape to trace-tier item and preserves metadata", () => {
    const tape: Record<string, unknown> = {
      missionId: "m-1",
      intent: "test",
      status: "completed",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:10.000Z",
      steps: [{ stepId: "s-1", goal: "g", status: "verified", toolName: "browser" }],
      customField: { a: 1 },
    };
    const frozen = JSON.parse(JSON.stringify(tape));
    const result = mapMissionTapeToLucaMemoryItems({ trace: tape, metadata: { x: 1 } });
    expect(result.ok).toBe(true);
    expect(result.item?.tier).toBe("trace");
    expect(result.item?.scope.missionId).toBe("m-1");
    expect(result.item?.metadata?.status).toBe("completed");
    expect(result.item?.metadata?.toolNames).toContain("browser");
    expect(result.item?.metadata?.x).toBe(1);
    expect(result.items?.length).toBe(2);
    expect(tape).toEqual(frozen);
  });

  it("maps mission tape step to operational item", () => {
    const tape = { missionId: "m-2", startedAt: "2026-01-01T00:00:00.000Z" };
    const step = { stepId: "s-2", status: "failed", toolOrRuntime: "shell", error: "boom" };
    const result = mapMissionTapeStepToLucaMemoryItem({ trace: tape, step, stepIndex: 2, sourceKind: "mission_tape" });
    expect(result.ok).toBe(true);
    expect(result.item?.tier).toBe("operational");
    expect(result.item?.metadata?.stepId).toBe("s-2");
    expect(result.item?.metadata?.stepIndex).toBe(2);
    expect(result.item?.metadata?.toolName).toBe("shell");
    expect(result.item?.metadata?.failure).toBe(true);
  });

  it("maps luca tracing event to trace item", () => {
    const event = {
      traceId: "t-1",
      spanId: "sp-1",
      missionId: "m-3",
      agentId: "a",
      event: "tool_call",
      status: "ok",
      timestamp: 123,
      error: undefined,
      unknown: "keep",
    };
    const result = mapTraceToLucaMemoryItem({ trace: event, sourceKind: "luca_tracing" });
    expect(result.ok).toBe(true);
    expect(result.item?.source).toBe("luca_tracing");
    expect(result.item?.metadata?.traceId).toBe("t-1");
    expect(result.item?.metadata?.spanId).toBe("sp-1");
    expect(result.item?.metadata?.eventName).toBe("tool_call");
    expect(result.item?.metadata?.status).toBe("ok");
  });

  it("infers source kinds", () => {
    expect(inferTraceMemorySourceKind({ missionId: "m", steps: [] })).toBe("mission_tape");
    expect(inferTraceMemorySourceKind({ traceId: "t", event: "e" })).toBe("luca_tracing");
    expect(inferTraceMemorySourceKind({})).toBe("unknown");
  });
});
