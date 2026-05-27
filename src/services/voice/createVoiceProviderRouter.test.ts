import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { createVoiceProviderRouter } from "./createVoiceProviderRouter";
import { LucaSTTBackend } from "./types";

function makeSTT(id: string): LucaSTTBackend {
  return {
    id,
    label: id,
    providerKind: "local",
    supportsStreaming: true,
    supportedLanguages: ["en"],
    transcribe: async () => ({ transcript: "ok", language: "en", confidence: 1, isFinal: true }),
    getSnapshot: () => ({ id, label: id, providerKind: "local", supportsStreaming: true, supportedLanguages: ["en"] }),
  };
}

describe("createVoiceProviderRouter", () => {
  it("factory exposes expected surface", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-local"));

    const factory = createVoiceProviderRouter(registry);
    expect(factory.router).toBeDefined();
    expect(typeof factory.route).toBe("function");
    expect(typeof factory.getSnapshot).toBe("function");
    expect(typeof factory.reset).toBe("function");

    const result = factory.route({ capability: "stt" });
    expect(result.ok).toBe(true);

    const snapshot = factory.getSnapshot();
    expect(snapshot.totalRoutes).toBe(1);

    factory.reset();
    expect(factory.getSnapshot().totalRoutes).toBe(0);
  });
});
