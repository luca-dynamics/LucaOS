import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { createVoiceProviderRouter } from "./createVoiceProviderRouter";
import { VoiceLocalProviderAdapter } from "./VoiceLocalProviderAdapter";

describe("VoiceLocalProviderAdapter", () => {
  it("registers local scaffold STT/TTS backends and routes local lane", () => {
    const registry = new VoiceBackendRegistry();
    const adapter = new VoiceLocalProviderAdapter();

    adapter.registerBackends(registry);

    const stt = registry.selectSTTBackend({ providerKind: "local" });
    const tts = registry.selectTTSBackend({ providerKind: "local" });

    expect(stt?.providerKind).toBe("local");
    expect(tts?.providerKind).toBe("local");

    const routerFactory = createVoiceProviderRouter(registry);
    const routeResult = routerFactory.route({ capability: "stt", preference: "local" });
    expect(routeResult.ok).toBe(true);
    expect(routeResult.selectedProviderKind).toBe("local");

    const snapshot = adapter.getSnapshot();
    expect(snapshot.metadata).toMatchObject({
      audioApisCalled: false,
      microphoneApisCalled: false,
      sttApisCalled: false,
      ttsApisCalled: false,
      providerApisCalled: false,
      systemApisCalled: false,
      heavyModelsLoaded: false,
      requiresExplicitOptIn: true,
    });
  });
});
