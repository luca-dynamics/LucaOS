import { describe, expect, it } from "vitest";
import {
  LOCALAI_CURATED_CATALOG,
  OLLAMA_BRAIN_CATALOG,
  WEBLLM_CATALOG,
  findLucaUnifiedModel,
  getLucaUnifiedModels,
  getLucaUnifiedModelsForRam,
} from "./lucaUnifiedModelRegistry";

describe("lucaUnifiedModelRegistry", () => {
  it("exposes a small curated LocalAI slice, all OpenAI-compatible", () => {
    expect(LOCALAI_CURATED_CATALOG.length).toBeGreaterThan(0);
    expect(LOCALAI_CURATED_CATALOG.length).toBeLessThanOrEqual(20);
    for (const model of LOCALAI_CURATED_CATALOG) {
      expect(model.source).toBe("openai-compatible");
    }
  });

  it("records license + provenance for every entry (nothing ships unsourced)", () => {
    for (const model of getLucaUnifiedModels()) {
      expect(model.license?.name, model.id).toBeTruthy();
      expect(["yes", "conditional", "no"]).toContain(model.license.commercialUse);
      expect(model.sourceUrl, model.id).toMatch(/^https?:\/\//);
    }
  });

  it("filters by source", () => {
    expect(getLucaUnifiedModels("openai-compatible").length).toBe(LOCALAI_CURATED_CATALOG.length);
    expect(getLucaUnifiedModels("ollama").length).toBe(OLLAMA_BRAIN_CATALOG.length);
    expect(getLucaUnifiedModels("webllm").length).toBe(WEBLLM_CATALOG.length);
  });

  it("finds a model by id", () => {
    expect(findLucaUnifiedModel("qwen2.5-7b-instruct")?.name).toContain("Qwen2.5");
    expect(findLucaUnifiedModel("not-a-model")).toBeUndefined();
  });

  it("recommends honest hardware-fit by minimum RAM", () => {
    // A 4GB machine should not be offered 8GB-min models.
    const lowEnd = getLucaUnifiedModelsForRam(4_000_000_000).map((m) => m.id);
    expect(lowEnd).toContain("llama-3.2-1b-instruct");
    expect(lowEnd).not.toContain("qwen2.5-7b-instruct");

    // A 64GB machine fits all models in the full catalog.
    const all = getLucaUnifiedModels();
    expect(getLucaUnifiedModelsForRam(64_000_000_000).length).toBe(all.length);
  });

  it("marks at most one recommended model per source", () => {
    for (const source of ["openai-compatible", "ollama", "webllm"] as const) {
      const recommended = getLucaUnifiedModels(source).filter((m) => m.recommended);
      expect(recommended.length, `${source} has more than one recommended`).toBeLessThanOrEqual(1);
    }
  });
});
