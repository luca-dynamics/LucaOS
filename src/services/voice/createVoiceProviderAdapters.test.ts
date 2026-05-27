import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { createVoiceProviderAdapters } from "./createVoiceProviderAdapters";

describe("createVoiceProviderAdapters", () => {
  it("registerAll wires local/cloud/byok scaffold backends", () => {
    const registry = new VoiceBackendRegistry();
    const factory = createVoiceProviderAdapters({
      registry,
      byok: { providerLabels: ["custom-provider"] },
    });

    factory.registerAll();

    expect(registry.selectSTTBackend({ providerKind: "local" })).toBeDefined();
    expect(registry.selectSTTBackend({ providerKind: "cloud" })).toBeDefined();
    expect(registry.selectSTTBackend({ providerKind: "byok" })).toBeDefined();

    const snapshots = factory.getSnapshots();
    expect(snapshots).toHaveLength(3);
    expect(snapshots.map((s) => s.adapterKind)).toEqual([
      "local_adapter",
      "luca_prime_cloud_adapter",
      "byok_adapter",
    ]);

    for (const snapshot of snapshots) {
      expect(snapshot.metadata.audioApisCalled).toBe(false);
      expect(snapshot.metadata.microphoneApisCalled).toBe(false);
      expect(snapshot.metadata.sttApisCalled).toBe(false);
      expect(snapshot.metadata.ttsApisCalled).toBe(false);
      expect(snapshot.metadata.providerApisCalled).toBe(false);
      expect(snapshot.metadata.systemApisCalled).toBe(false);
      expect(snapshot.metadata.heavyModelsLoaded).toBe(false);
      expect(snapshot.metadata.requiresExplicitOptIn).toBe(true);
    }

    factory.reset();
    expect(factory.getSnapshots().every((s) => s.registeredBackends.length === 0)).toBe(true);
  });
});
