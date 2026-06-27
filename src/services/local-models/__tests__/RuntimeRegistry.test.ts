import { describe, expect, it } from "vitest";
import type { LocalRuntimeAdapter } from "../LocalRuntimeAdapter";
import { createRuntimeHealth } from "../LocalRuntimeAdapter";
import { createDefaultLocalRuntimeRegistry, RuntimeRegistry } from "../RuntimeRegistry";

const adapter = (kind: LocalRuntimeAdapter["kind"]): LocalRuntimeAdapter => ({
  kind,
  health: async () =>
    createRuntimeHealth({ runtime: kind, reachable: true, modelIds: [kind] }),
  listModels: async () => [kind],
  chat: async (request) => ({
    text: "ok",
    runtime: kind,
    model: request.model,
  }),
});

describe("RuntimeRegistry", () => {
  it("registers and returns adapters by kind", () => {
    const registry = new RuntimeRegistry();
    const ollama = adapter("ollama");

    registry.register(ollama);

    expect(registry.get("ollama")).toBe(ollama);
    expect(registry.require("ollama")).toBe(ollama);
    expect(registry.list()).toEqual([ollama]);
  });

  it("rejects duplicate registrations", () => {
    const registry = new RuntimeRegistry();
    registry.register(adapter("cortex"));

    expect(() => registry.register(adapter("cortex"))).toThrow(
      "Local runtime already registered: cortex",
    );
  });

  it("allows explicit replacement", () => {
    const registry = new RuntimeRegistry();
    const first = adapter("webllm");
    const second = adapter("webllm");

    registry.register(first);
    registry.replace(second);

    expect(registry.require("webllm")).toBe(second);
  });

  it("throws when a required runtime is missing", () => {
    const registry = new RuntimeRegistry();

    expect(() => registry.require("mediapipe")).toThrow(
      "Local runtime not registered: mediapipe",
    );
  });

  it("registers Luca-owned desktop Cortex and Ollama adapters by default", () => {
    const registry = createDefaultLocalRuntimeRegistry();

    expect(registry.require("cortex").kind).toBe("cortex");
    expect(registry.require("ollama").kind).toBe("ollama");
  });
});
