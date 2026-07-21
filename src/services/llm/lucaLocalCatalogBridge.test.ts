import { describe, expect, it } from "vitest";
import {
  getLocalCatalogDivergenceReport,
  getOfflineModelsFromLocalCatalog,
  listLocalCatalogByRuntime,
  listLocalCatalogForRam,
  listLocalCatalogView,
  listRecommendedLocalCatalog,
  resolveBrainCatalogMetadata,
  resolveLocalCatalogMetadata,
} from "./lucaLocalCatalogBridge";
import { getLucaUnifiedModels } from "./lucaUnifiedModelRegistry";
import { LOCAL_MODEL_CATALOG } from "../local-models/LocalModelCatalog";
import { OFFLINE_MODELS } from "./ModelRegistry";

describe("lucaLocalCatalogBridge (L5)", () => {
  it("merges unified, runtime facade, and offline catalogs", () => {
    const view = listLocalCatalogView(OFFLINE_MODELS);
    expect(view.length).toBeGreaterThan(0);
    expect(view.every((entry) => entry.origins.length > 0)).toBe(true);
    expect(view.every((entry) => entry.id && entry.name)).toBe(true);
  });

  it("reports divergence without throwing", () => {
    const report = getLocalCatalogDivergenceReport(OFFLINE_MODELS);
    expect(report.unifiedCount).toBe(getLucaUnifiedModels().length);
    expect(report.runtimeFacadeCount).toBe(LOCAL_MODEL_CATALOG.length);
    expect(report.offlineRegistryCount).toBe(OFFLINE_MODELS.length);
    expect(report.mergedCount).toBe(listLocalCatalogView(OFFLINE_MODELS).length);
    expect(Array.isArray(report.facadeOnlyIds)).toBe(true);
    expect(Array.isArray(report.offlineOnlyIds)).toBe(true);
  });

  it("builds offline models from unified webllm plus leftover offline rows", () => {
    const offline = getOfflineModelsFromLocalCatalog(OFFLINE_MODELS);
    expect(offline.length).toBeGreaterThanOrEqual(OFFLINE_MODELS.length);
    const webllmIds = getLucaUnifiedModels("webllm").map((m) => m.id);
    for (const id of webllmIds) {
      expect(offline.some((m) => m.id === id)).toBe(true);
    }
  });

  it("filters by runtime and RAM", () => {
    const ollama = listLocalCatalogByRuntime("ollama", OFFLINE_MODELS);
    expect(ollama.every((e) => e.runtime === "ollama")).toBe(true);
    const lowRam = listLocalCatalogForRam(2_000_000_000, OFFLINE_MODELS);
    expect(
      lowRam.every(
        (e) => e.minRamBytes === undefined || e.minRamBytes <= 2_000_000_000,
      ),
    ).toBe(true);
  });

  it("resolveBrainCatalogMetadata prefers unified ollama rows", () => {
    const ollama = getLucaUnifiedModels("ollama");
    expect(ollama.length).toBeGreaterThan(0);
    const sample = ollama[0];
    const meta = resolveBrainCatalogMetadata(sample.id);
    expect(meta).toBeDefined();
    expect(meta?.name).toBe(sample.name);
    expect(meta?.description).toBe(sample.description);
    expect(meta?.licenseName).toBe(sample.license.name);
    expect(meta?.commercialUse).toBe(sample.license.commercialUse);
    expect(meta?.sourceUrl).toBe(sample.sourceUrl);
    expect(meta?.sourceLabel).toBe("Ollama");
    expect(meta?.origins.length).toBeGreaterThan(0);
  });

  it("resolveLocalCatalogMetadata is the product SoT alias", () => {
    const sample = getLucaUnifiedModels("webllm")[0];
    expect(sample).toBeDefined();
    expect(resolveLocalCatalogMetadata(sample.id)?.id).toBe(
      resolveBrainCatalogMetadata(sample.id)?.id,
    );
  });

  it("listRecommendedLocalCatalog only returns recommended entries", () => {
    const recommended = listRecommendedLocalCatalog(OFFLINE_MODELS);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.every((e) => e.recommended)).toBe(true);
  });

  it("resolveBrainCatalogMetadata returns undefined for empty/unknown ids", () => {
    expect(resolveBrainCatalogMetadata("")).toBeUndefined();
    expect(resolveBrainCatalogMetadata("definitely-not-a-real-model-xyz")).toBeUndefined();
  });
});
