import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { createVoiceProviderRouter } from "./createVoiceProviderRouter";
import { VoiceLucaPrimeProviderAdapter } from "./VoiceLucaPrimeProviderAdapter";

describe("VoiceLucaPrimeProviderAdapter", () => {
  it("registers cloud scaffold STT/TTS backends and routes cloud lane", () => {
    const registry = new VoiceBackendRegistry();
    const adapter = new VoiceLucaPrimeProviderAdapter();

    adapter.registerBackends(registry);

    const stt = registry.selectSTTBackend({ providerKind: "cloud" });
    const tts = registry.selectTTSBackend({ providerKind: "cloud" });

    expect(stt?.providerKind).toBe("cloud");
    expect(tts?.providerKind).toBe("cloud");

    const routerFactory = createVoiceProviderRouter(registry);
    const routeResult = routerFactory.route({ capability: "tts", preference: "cloud" });
    expect(routeResult.ok).toBe(true);
    expect(routeResult.selectedProviderKind).toBe("cloud");

    expect(adapter.getSnapshot().metadata.providerApisCalled).toBe(false);
  });
});
