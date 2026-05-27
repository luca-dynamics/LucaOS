import { describe, expect, it } from "vitest";
import { createVoiceStreamingRuntime } from "./createVoiceStreamingRuntime";

describe("createVoiceStreamingRuntime", () => {
  it("factory exposes expected surface", () => {
    const factory = createVoiceStreamingRuntime();
    expect(factory.runtime).toBeDefined();
    expect(typeof factory.openStream).toBe("function");
    expect(typeof factory.pushChunk).toBe("function");
    expect(typeof factory.pauseStream).toBe("function");
    expect(typeof factory.completeStream).toBe("function");
    expect(typeof factory.interruptStream).toBe("function");
    expect(typeof factory.failStream).toBe("function");
    expect(typeof factory.getSnapshot).toBe("function");
    expect(typeof factory.reset).toBe("function");

    const stream = factory.openStream({ kind: "stt" });
    factory.pushChunk({ streamId: stream.streamId, kind: "stt", text: "hello" });
    expect(factory.getSnapshot(stream.streamId).chunks).toHaveLength(1);

    factory.reset();
    expect(factory.getSnapshot().totalSessions).toBe(0);
  });
});
