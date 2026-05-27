import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { createVoiceProviderAdapters } from "./createVoiceProviderAdapters";
import { createVoiceRealProviderAdapterShell } from "./createVoiceRealProviderAdapterShell";

describe("createVoiceRealProviderAdapterShell", () => {
  it("creates adapter and forwards invoke/getSnapshot/reset", () => {
    const registry = new VoiceBackendRegistry();
    const adapters = createVoiceProviderAdapters({ registry });
    adapters.localAdapter.registerBackends(registry);

    const router = new VoiceProviderRouter(registry);
    const factory = createVoiceRealProviderAdapterShell(router);

    const result = factory.invoke({
      providerKind: "local",
      capability: "stt",
      adapterKind: "local_model",
      metadata: { requestId: "req-1" },
    });

    expect(result.status).toBe("invocation_disabled");
    expect(factory.getSnapshot().totalInvocations).toBe(1);
    expect(factory.getSnapshot().lastResult?.metadata.requestId).toBe("req-1");

    factory.reset();
    expect(factory.getSnapshot().totalInvocations).toBe(0);
  });
});
