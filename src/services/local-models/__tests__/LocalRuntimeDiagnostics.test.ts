import { describe, expect, it, vi } from "vitest";
import { LocalInferenceAdmission } from "../LocalInferenceAdmission";
import { LocalModelLease } from "../LocalModelLease";
import { createRuntimeHealth, type LocalRuntimeAdapter } from "../LocalRuntimeAdapter";
import { LocalRuntimeDiagnostics } from "../LocalRuntimeDiagnostics";
import { RuntimeRegistry } from "../RuntimeRegistry";

const adapter = (overrides: Partial<LocalRuntimeAdapter> = {}): LocalRuntimeAdapter => ({
  kind: "ollama",
  health: vi.fn(async () =>
    createRuntimeHealth({ runtime: "ollama", reachable: true, modelIds: ["llama3.2:1b"] }),
  ),
  listModels: vi.fn(async () => ["llama3.2:1b"]),
  chat: vi.fn(async (request) => ({
    text: "ok",
    runtime: "ollama",
    model: request.model,
  })),
  ...overrides,
});

describe("LocalRuntimeDiagnostics", () => {
  it("captures registered runtime health, catalog summaries, admission, and leases", async () => {
    const registry = new RuntimeRegistry();
    registry.register(adapter());
    const admission = new LocalInferenceAdmission({ global: 2, byRuntime: { ollama: 1 } });
    const token = admission.tryAcquire("ollama");
    const lease = new LocalModelLease();
    lease.acquire("ollama:llama3.2:1b");

    const diagnostics = new LocalRuntimeDiagnostics({
      registry,
      admission,
      lease,
      now: () => 1234,
      catalog: [
        {
          id: "ollama:llama3.2:1b",
          displayName: "Llama 3.2 1B",
          runtime: "ollama",
          runtimeModelId: "llama3.2:1b",
          features: ["chat", "streaming"],
          recommended: true,
        },
      ],
    });

    const snapshot = await diagnostics.snapshot();

    expect(snapshot.generatedAt).toBe(1234);
    expect(snapshot.registeredRuntimes).toEqual(["ollama"]);
    expect(snapshot.healthByRuntime.ollama?.health?.status).toBe("online");
    expect(snapshot.catalogByRuntime.ollama).toEqual({
      runtime: "ollama",
      totalModels: 1,
      recommendedModels: 1,
      modelIds: ["ollama:llama3.2:1b"],
      runtimeModelIds: ["llama3.2:1b"],
    });
    expect(snapshot.admission.globalActive).toBe(1);
    expect(snapshot.admission.activeByRuntime).toEqual({ ollama: 1 });
    expect(snapshot.leases.activeByModel).toEqual({ "ollama:llama3.2:1b": 1 });

    token?.release();
  });

  it("records runtime health errors without failing the whole snapshot", async () => {
    const registry = new RuntimeRegistry();
    registry.register(
      adapter({
        kind: "cortex",
        health: vi.fn(async () => {
          throw new Error("cortex booting");
        }),
      }),
    );

    const diagnostics = new LocalRuntimeDiagnostics({
      registry,
      admission: new LocalInferenceAdmission(),
      lease: new LocalModelLease(),
      catalog: [],
    });

    const snapshot = await diagnostics.snapshot();

    expect(snapshot.registeredRuntimes).toEqual(["cortex"]);
    expect(snapshot.healthByRuntime.cortex).toEqual({
      runtime: "cortex",
      registered: true,
      error: "cortex booting",
    });
    expect(snapshot.catalogByRuntime).toEqual({});
  });
});
