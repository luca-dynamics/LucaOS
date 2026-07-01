import { describe, expect, it } from "vitest";
import {
  LOCAL_MODEL_CATALOG,
  findLocalModelDescriptor,
  getLocalModelsByRuntime,
  getLocalModelsWithFeature,
  getRecommendedLocalModels,
} from "../LocalModelCatalog";

describe("LocalModelCatalog", () => {
  it("contains seed models for every planned runtime kind", () => {
    expect(getLocalModelsByRuntime("ollama").length).toBeGreaterThan(0);
    expect(getLocalModelsByRuntime("cortex").length).toBeGreaterThan(0);
    expect(getLocalModelsByRuntime("webllm").length).toBeGreaterThan(0);
    expect(getLocalModelsByRuntime("mediapipe").length).toBeGreaterThan(0);
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
      displayName: "Liquid LFM2.5 230M GGUF",
      runtime: "cortex",
      runtimeModelId: "lfm2.5-230m",
      contextWindow: 32768,
      install: { strategy: "manual", ref: "LiquidAI/LFM2.5-230M-GGUF" },
    });
    expect(model?.features).toEqual(expect.arrayContaining(["chat", "streaming"]));
  });

  it("returns models by feature", () => {
    const streamingModels = getLocalModelsWithFeature("streaming");

    expect(streamingModels.length).toBeGreaterThan(0);
    expect(streamingModels.every((model) => model.features.includes("streaming"))).toBe(
      true,
    );
  });

  it("marks a small set of recommended defaults", () => {
    const recommended = getRecommendedLocalModels();

    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.every((model) => model.recommended)).toBe(true);
  });

  it("uses unique catalog ids", () => {
    const ids = LOCAL_MODEL_CATALOG.map((model) => model.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
