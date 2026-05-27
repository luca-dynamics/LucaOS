import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { VoiceRealProviderAdapterShell } from "./VoiceRealProviderAdapterShell";
import { createVoiceProviderAdapters } from "./createVoiceProviderAdapters";

describe("VoiceRealProviderAdapterShell", () => {
  const setup = () => {
    const registry = new VoiceBackendRegistry();
    const adapters = createVoiceProviderAdapters({ registry });
    adapters.localAdapter.registerBackends(registry);
    adapters.lucaPrimeAdapter.registerBackends(registry);
    adapters.byokAdapter.registerBackends(registry);
    const router = new VoiceProviderRouter(registry);
    return { router };
  };

  it("returns invocation_disabled when readiness is scaffold_only", () => {
    const { router } = setup();
    const shell = new VoiceRealProviderAdapterShell(router);
    const result = shell.invoke({ providerKind: "local", capability: "stt", adapterKind: "local_model" });

    expect(result.status).toBe("invocation_disabled");
    expect(result.ok).toBe(false);
    expect(result.metadata).toMatchObject({
      adapterKind: "voice_real_provider_adapter_shell",
      shellOnly: true,
      realProviderExecutionEnabled: false,
      audioApisCalled: false,
      microphoneApisCalled: false,
      sttApisCalled: false,
      ttsApisCalled: false,
      providerApisCalled: false,
      networkApisCalled: false,
      heavyModelsLoaded: false,
      systemApisCalled: false,
      requiresExplicitOptIn: true,
    });
  });

  it("returns blocked when readiness is blocked", () => {
    const { router } = setup();
    const shell = new VoiceRealProviderAdapterShell(router, { readinessOverrides: { backendAvailable: false } });
    const result = shell.invoke({ providerKind: "cloud", capability: "tts", adapterKind: "openai_compatible" });

    expect(result.status).toBe("blocked");
    expect(result.ok).toBe(false);
  });

  it("returns ready when readiness is ready but keeps provider invocation disabled", () => {
    const { router } = setup();
    const shell = new VoiceRealProviderAdapterShell(router, {
      featureFlags: {
        enableRealLucaPrimeVoiceProvider: true,
        enableRealStt: true,
        enableNetworkProviderCalls: true,
      },
      readinessOverrides: { backendAvailable: true, networkAllowed: true },
    });

    const result = shell.invoke({ providerKind: "cloud", capability: "stt", adapterKind: "openai_compatible" });
    expect(result.status).toBe("ready");
    expect(result.ok).toBe(true);
    expect(result.outputPlaceholder).toContain("invocation intentionally disabled");
  });

  it("preserves request metadata for local, cloud, and byok requests", () => {
    const { router } = setup();
    const shell = new VoiceRealProviderAdapterShell(router);

    const local = shell.invoke({ providerKind: "local", capability: "stt", adapterKind: "local_model", metadata: { tenant: "a" } });
    const cloud = shell.invoke({ providerKind: "cloud", capability: "tts", adapterKind: "openai_compatible", metadata: { tenant: "b" } });
    const byok = shell.invoke({ providerKind: "byok", capability: "streaming_tts", adapterKind: "custom_byok", metadata: { tenant: "c" } });

    expect(local.metadata.tenant).toBe("a");
    expect(cloud.metadata.tenant).toBe("b");
    expect(byok.metadata.tenant).toBe("c");
  });

  it("tracks snapshot counters and supports reset", () => {
    const { router } = setup();
    const shell = new VoiceRealProviderAdapterShell(router, { readinessOverrides: { backendAvailable: false } });
    shell.invoke({ providerKind: "local", capability: "stt", adapterKind: "local_model" });

    const beforeReset = shell.getSnapshot();
    expect(beforeReset.totalInvocations).toBe(1);
    expect(beforeReset.statusCounts.blocked).toBe(1);

    shell.reset();
    const afterReset = shell.getSnapshot();
    expect(afterReset.totalInvocations).toBe(0);
    expect(afterReset.statusCounts).toEqual({
      disabled: 0,
      blocked: 0,
      ready: 0,
      invocation_disabled: 0,
    });
  });
});
