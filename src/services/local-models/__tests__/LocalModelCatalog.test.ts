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
