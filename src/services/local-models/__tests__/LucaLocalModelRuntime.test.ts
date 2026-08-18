import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalInferenceAdmission } from "../LocalInferenceAdmission";
import { LocalModelLease } from "../LocalModelLease";
import { LucaLocalModelRuntime } from "../LucaLocalModelRuntime";
import { nativeGgufModelRegistry } from "../NativeGgufModelRegistry";
import { RuntimeRegistry } from "../RuntimeRegistry";
import type { LocalRuntimeAdapter } from "../LocalRuntimeAdapter";
import { createRuntimeHealth } from "../LocalRuntimeAdapter";

const makeAdapter = (): LocalRuntimeAdapter => ({
  kind: "ollama",
  ensureReady: vi.fn(async () => {}),
  health: async () =>
    createRuntimeHealth({
      runtime: "ollama",
      reachable: true,
      modelIds: ["llama3.2:1b"],
    }),
  listModels: async () => ["llama3.2:1b"],
  chat: vi.fn(async (request) => ({
    text: `model=${request.model}`,
    runtime: "ollama",
    model: request.model,
  })),
  stream: vi.fn(async function* (request) {
    yield { type: "token", text: `model=${request.model}` };
    yield { type: "done" };
  }),
});

describe("LucaLocalModelRuntime", () => {
  afterEach(() => nativeGgufModelRegistry.unregister("gguf-tiny"));

  it("routes catalog models through registry, admission, and leases", async () => {
    const adapter = makeAdapter();
    const registry = new RuntimeRegistry();
    const admission = new LocalInferenceAdmission({ global: 1, byRuntime: { ollama: 1 } });
    const lease = new LocalModelLease();
    registry.register(adapter);

    const runtime = new LucaLocalModelRuntime({ registry, admission, lease });

    const response = await runtime.chat({
      model: "ollama:llama3.2:1b",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.text).toBe("model=llama3.2:1b");
    expect(adapter.ensureReady).toHaveBeenCalledOnce();
    expect(adapter.chat).toHaveBeenCalledWith(
      expect.objectContaining({ model: "llama3.2:1b" }),
    );
    expect(admission.getActiveCount()).toBe(0);
    expect(lease.count("ollama:llama3.2:1b")).toBe(0);
  });

  it("releases admission and lease when an adapter throws", async () => {
    const adapter = makeAdapter();
    vi.mocked(adapter.chat).mockRejectedValueOnce(new Error("boom"));
    const registry = new RuntimeRegistry();
    const admission = new LocalInferenceAdmission({ global: 1, byRuntime: { ollama: 1 } });
    const lease = new LocalModelLease();
    registry.register(adapter);

    const runtime = new LucaLocalModelRuntime({ registry, admission, lease });

    await expect(
      runtime.chat({
        model: "llama3.2:1b",
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow("boom");
    expect(admission.getActiveCount()).toBe(0);
    expect(lease.count("ollama:llama3.2:1b")).toBe(0);
  });

  it("rejects unknown local models", async () => {
    const runtime = new LucaLocalModelRuntime({ registry: new RuntimeRegistry() });

    await expect(
      runtime.chat({ model: "unknown", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow("Unknown local model: unknown");
  });

  it("rejects saturated runtimes before calling the adapter", async () => {
    const adapter = makeAdapter();
    const registry = new RuntimeRegistry();
    const admission = new LocalInferenceAdmission({ global: 1, byRuntime: { ollama: 1 } });
    registry.register(adapter);
    const token = admission.tryAcquire("ollama");

    const runtime = new LucaLocalModelRuntime({ registry, admission });

    await expect(
      runtime.chat({
        model: "ollama:llama3.2:1b",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Local runtime is busy: ollama");
    expect(adapter.chat).not.toHaveBeenCalled();
    token?.release();
  });

  it("rejects a native-gguf id that no registration backs", async () => {
    const runtime = new LucaLocalModelRuntime({ registry: new RuntimeRegistry() });

    // A `native-gguf:<path>` prefix used to synthesize its own descriptor, so
    // any string spelled this way resolved to a loadable model without ever
    // being registered or consented to. Only the registry may name one now.
    await expect(
      runtime.chat({
        model: "native-gguf:C:/anywhere/unvetted.gguf",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Unknown local model: native-gguf:C:/anywhere/unvetted.gguf");
  });

  it("resolves a native-gguf model that is registered", async () => {
    nativeGgufModelRegistry.register({
      id: "gguf-tiny",
      modelPath: "C:/models/tiny.gguf",
      displayName: "Tiny GGUF",
    });
    const adapter: LocalRuntimeAdapter = {
      kind: "native-gguf",
      health: async () =>
        createRuntimeHealth({ runtime: "native-gguf", reachable: true }),
      listModels: async () => ["gguf-tiny"],
      chat: vi.fn(async (request) => ({
        text: `native=${request.model}`,
        runtime: "native-gguf" as const,
        model: request.model,
      })),
    };
    const registry = new RuntimeRegistry();
    registry.register(adapter);

    const runtime = new LucaLocalModelRuntime({ registry });

    await expect(
      runtime.chat({
        model: "gguf-tiny",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toMatchObject({ text: "native=gguf-tiny" });
  });

  it("streams catalog models through registry, admission, and leases", async () => {
    const adapter = makeAdapter();
    const registry = new RuntimeRegistry();
    const admission = new LocalInferenceAdmission({ global: 1, byRuntime: { ollama: 1 } });
    const lease = new LocalModelLease();
    registry.register(adapter);

    const runtime = new LucaLocalModelRuntime({ registry, admission, lease });

    const events = [];
    for await (const event of runtime.stream({
      model: "ollama:llama3.2:1b",
      messages: [{ role: "user", content: "hello" }],
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "token", text: "model=llama3.2:1b" },
      { type: "done" },
    ]);
    expect(adapter.ensureReady).toHaveBeenCalledOnce();
    expect(adapter.stream).toHaveBeenCalledWith(
      expect.objectContaining({ model: "llama3.2:1b", stream: true }),
    );
    expect(admission.getActiveCount()).toBe(0);
    expect(lease.count("ollama:llama3.2:1b")).toBe(0);
  });
});
