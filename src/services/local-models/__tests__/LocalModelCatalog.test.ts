import { describe, expect, it } from "vitest";
import {
  LOCAL_MODEL_CATALOG,
  findLocalModelDescriptor,
  getLocalModelsByRuntime,
  getLocalModelsWithFeature,
  getRecommendedLocalModels,
} from "../LocalModelCatalog";

describe("LocalModelCatalog", () => {
  it("contains only runtime kinds registered by the default runtime", () => {
    expect(getLocalModelsByRuntime("ollama").length).toBeGreaterThan(0);
    expect(getLocalModelsByRuntime("cortex").length).toBeGreaterThan(0);
    expect(getLocalModelsByRuntime("webllm")).toEqual([]);
    expect(getLocalModelsByRuntime("mediapipe")).toEqual([]);
  });

  it("finds models by canonical id or runtime model id", () => {
    expect(findLocalModelDescriptor("ollama:llama3.2:1b")?.runtime).toBe(
      "ollama",
    );
    expect(findLocalModelDescriptor("llama3.2:1b")?.id).toBe(
      "ollama:llama3.2:1b",
    );
    expect(findLocalModelDescriptor("phi-3-mini")?.id).toBe(
      "cortex:phi-3-mini",
    );
  });

  it("derives Cortex descriptors from the canonical lifecycle catalog", () => {
    const model = findLocalModelDescriptor("cortex:phi-3-mini");

    expect(model).toMatchObject({
      displayName: "Phi-3 Mini 3.8B",
      runtime: "cortex",
      runtimeModelId: "phi-3-mini",
      install: { strategy: "cortex-download", ref: "phi-3-mini" },
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
