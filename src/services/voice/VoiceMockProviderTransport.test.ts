import { describe, expect, it } from "vitest";
import { VoiceMockProviderTransport } from "./VoiceMockProviderTransport";

describe("VoiceMockProviderTransport", () => {
  it("records requests and returns queued/default results", async () => {
    const transport = new VoiceMockProviderTransport();
    transport.queueResult({ ok: false, status: 500, error: "boom", metadata: { once: true } });

    const first = await transport.send({ requestId: "1", method: "POST", path: "/x" });
    const second = await transport.send({ requestId: "2", method: "GET", path: "/y" });

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(true);
    const snapshot = transport.getSnapshot();
    expect(snapshot.requestCount).toBe(2);
    expect(snapshot.requests[0].path).toBe("/x");
  });

  it("reset clears state", async () => {
    const transport = new VoiceMockProviderTransport();
    await transport.send({ requestId: "1", method: "POST", path: "/x" });
    transport.reset();
    expect(transport.getSnapshot().requestCount).toBe(0);
  });
});
