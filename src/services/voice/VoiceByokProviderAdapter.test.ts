import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { createVoiceProviderRouter } from "./createVoiceProviderRouter";
import { VoiceByokProviderAdapter } from "./VoiceByokProviderAdapter";

describe("VoiceByokProviderAdapter", () => {
  it("registers byok scaffold STT/TTS backends and routes byok lane", () => {
    const registry = new VoiceBackendRegistry();
    const adapter = new VoiceByokProviderAdapter({ providerLabels: ["openai", "deepgram"] });

    adapter.registerBackends(registry);

    const stt = registry.selectSTTBackend({ providerKind: "byok" });
    const tts = registry.selectTTSBackend({ providerKind: "byok" });

    expect(stt?.providerKind).toBe("byok");
    expect(tts?.providerKind).toBe("byok");
    expect(stt?.label).toContain("openai");

    const routerFactory = createVoiceProviderRouter(registry);
    const routeResult = routerFactory.route({ capability: "stt", preference: "byok" });
    expect(routeResult.ok).toBe(true);
    expect(routeResult.selectedProviderKind).toBe("byok");

    expect(adapter.getSnapshot().metadata.requiresExplicitOptIn).toBe(true);
  });
});
