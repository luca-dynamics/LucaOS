import { describe, expect, it } from "vitest";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";

describe("VoiceInMemoryTapeSink", () => {
  it("records, filters, snapshots, and resets", () => {
    const sink = new VoiceInMemoryTapeSink();
    sink.record({ eventType: "voice_session_started", sessionId: "s1", timestamp: "2026-01-01T00:00:00.000Z", payload: { a: 1 } });
    sink.record({ eventType: "voice_session_stopped", sessionId: "s2", timestamp: "2026-01-01T00:00:01.000Z", payload: { b: 2 } });

    expect(sink.listRecords()).toHaveLength(2);
    expect(sink.listRecords("s1")).toHaveLength(1);
    expect(sink.getSnapshot("s2").totalRecords).toBe(1);

    sink.reset();
    expect(sink.getSnapshot().totalRecords).toBe(0);
  });
});
