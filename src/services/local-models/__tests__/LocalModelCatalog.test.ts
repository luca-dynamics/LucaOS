import { describe, expect, it } from "vitest";
import {
  LOCAL_MODEL_CATALOG,
  findLocalModelDescriptor,
  getLocalModelsByRuntime,
  getLocalModelsWithFeature,
  getRecommendedLocalModels,
} from "../LocalModelCatalog";
import { LOCAL_MODEL_DEFINITIONS } from "../LocalModelDefinitions";
import { localRuntimeRegistry } from "../RuntimeRegistry";

describe("LocalModelCatalog", () => {
  it("contains seed models for every runtime that has an adapter", () => {
    expect(getLocalModelsByRuntime("ollama").length).toBeGreaterThan(0);
    expect(getLocalModelsByRuntime("cortex").length).toBeGreaterThan(0);
  });

  it("only offers descriptors a registered runtime can execute", () => {
    const executable = new Set(
      localRuntimeRegistry.list().map((adapter) => adapter.kind),
    );

    // The point of the projection: nothing in the catalog is unrunnable. webllm
    // and mediapipe have no adapter, so they are absent rather than listed and
    // broken — the old hand-typed catalog listed four such models.
    expect(getLocalModelsByRuntime("webllm")).toEqual([]);
    expect(getLocalModelsByRuntime("mediapipe")).toEqual([]);
    for (const model of LOCAL_MODEL_CATALOG) {
      expect(executable, model.id).toContain(model.runtime);
    }
  });

  it("finds models by canonical id or runtime model id", () => {
    expect(findLocalModelDescriptor("ollama:llama3.2:3b")?.runtime).toBe(
      "ollama",
    );
    expect(findLocalModelDescriptor("llama3.2:3b")?.id).toBe(
      "ollama:llama3.2:3b",
    );
    expect(findLocalModelDescriptor("lfm2.5-230m")?.id).toBe(
      "cortex:lfm2.5-230m",
    );
  });

  it("includes Liquid LFM2.5 230M in the Cortex local model lane", () => {
    const model = findLocalModelDescriptor("cortex:lfm2.5-230m");

    expect(model).toMatchObject({
      displayName: "Liquid LFM2.5 230M",
      runtime: "cortex",
      runtimeModelId: "lfm2.5-230m",
      contextWindow: 32768,
      install: { strategy: "manual", ref: "LiquidAI/LFM2.5-230M-GGUF" },
    });
    expect(model?.features).toEqual(
      expect.arrayContaining(["chat", "streaming"]),
    );
  });

  it("emits one descriptor per runtime a model can run under", () => {
    // Llama 3.2 1B ships both as an Ollama tag and as a GGUF Cortex can load;
    // one definition, two executable descriptors.
    expect(findLocalModelDescriptor("ollama:llama3.2:1b")?.runtimeModelId).toBe(
      "llama3.2:1b",
    );
    expect(findLocalModelDescriptor("cortex:llama-3.2-1b")?.runtimeModelId).toBe(
      "llama-3.2-1b",
    );
  });

  it("carries each model's real context window rather than one shared default", () => {
    const windows = new Set(
      LOCAL_MODEL_CATALOG.map((model) => model.contextWindow),
    );

    // A uniform value here would mean the projection invented it. Chunking and
    // truncation read this number, so flattening it silently corrupts both.
    expect(windows.size).toBeGreaterThan(1);
    expect(findLocalModelDescriptor("ollama:qwen2.5:7b")?.contextWindow).toBe(
      32768,
    );
    expect(findLocalModelDescriptor("cortex:phi-3-mini")?.contextWindow).toBe(
      4096,
    );
    expect(findLocalModelDescriptor("ollama:llama3.2:1b")?.contextWindow).toBe(
      131072,
    );
  });

  it("takes every field from the definitions, holding no model data of its own", () => {
    for (const model of LOCAL_MODEL_CATALOG) {
      const def = LOCAL_MODEL_DEFINITIONS.find(
        (candidate) =>
          candidate.ollamaTag === model.runtimeModelId ||
          candidate.id === model.runtimeModelId,
      );

      expect(def, model.id).toBeDefined();
      expect(model.displayName, model.id).toBe(def?.name);
      expect(model.sizeBytes, model.id).toBe(def?.size);
      expect(model.minRamBytes, model.id).toBe(def?.memoryRequirement);
    }
  });

  it("returns models by feature", () => {
    const streamingModels = getLocalModelsWithFeature("streaming");

    expect(streamingModels.length).toBeGreaterThan(0);
    expect(
      streamingModels.every((model) => model.features.includes("streaming")),
    ).toBe(true);
  });

  it("marks a vision model vision-capable and leaves the rest text-only", () => {
    const vision = getLocalModelsWithFeature("vision");

    expect(vision.map((model) => model.id)).toEqual(["ollama:gemma3:4b"]);
  });

  it("marks a small set of recommended defaults", () => {
    const recommended = getRecommendedLocalModels();

    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.every((model) => model.recommended)).toBe(true);
    // The recommendation belongs to the model as Luca delivers it, so a second
    // runtime for the same model does not inherit it.
    expect(findLocalModelDescriptor("cortex:llama-3.2-1b")?.recommended).toBe(
      undefined,
    );
  });

  it("uses unique catalog ids", () => {
    const ids = LOCAL_MODEL_CATALOG.map((model) => model.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
