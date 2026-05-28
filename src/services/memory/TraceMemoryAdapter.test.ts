import { describe, expect, it } from "vitest";
import { TraceMemoryAdapter } from "./TraceMemoryAdapter";

describe("TraceMemoryAdapter", () => {
  it("exposes adapter-only snapshot flags", () => {
    const snapshot = TraceMemoryAdapter.getSnapshot();
    expect(snapshot.adapterOnly).toBe(true);
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.traceWritesRedirected).toBe(false);
    expect(snapshot.tapeWritesRedirected).toBe(false);
  });

  it("maps trace and mission tape through adapter", () => {
    const trace = TraceMemoryAdapter.mapTrace({ trace: { traceId: "t", event: "x", timestamp: 1 } });
    expect(trace.ok).toBe(true);

    const tape = TraceMemoryAdapter.mapMissionTape({ trace: { missionId: "m", status: "completed", startedAt: "2026-01-01T00:00:00.000Z", steps: [] } });
    expect(tape.ok).toBe(true);
    expect(tape.item?.tier).toBe("trace");
  });
});
