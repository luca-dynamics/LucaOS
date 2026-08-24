import { LOCAL_MODEL_DEFINITIONS } from "./LocalModelLibrary";
import type {
  LocalModelDescriptor,
  LocalModelFeature,
  LocalRuntimeKind,
} from "./LocalModelTypes";

/**
 * Inference-ready projection of Luca's canonical lifecycle catalog.
 *
 * Browser-only WebLLM and MediaPipe assets live in ModelRegistry and are not
 * advertised here until they implement LocalRuntimeAdapter. This guarantees
 * that every descriptor returned by this module can be executed by the default
 * LucaLocalModelRuntime registry.
 */
export const LOCAL_MODEL_CATALOG: LocalModelDescriptor[] =
  LOCAL_MODEL_DEFINITIONS.filter((model) => model.category === "brain").map(
    (model): LocalModelDescriptor => ({
      id: `${model.runtime === "ollama" ? "ollama" : "cortex"}:${model.ollamaTag ?? model.id}`,
      displayName: model.name,
      runtime: model.runtime === "ollama" ? "ollama" : "cortex",
      runtimeModelId: model.ollamaTag ?? model.id,
      sizeBytes: model.size,
      minRamBytes: model.memoryRequirement,
      contextWindow: 8192,
      features:
        model.runtime === "ollama"
          ? ["chat", "streaming", "tools"]
          : ["chat", "streaming"],
      recommended:
        model.id === "llama-3.2-1b" ||
        model.id === "qwen-2.5-7b" ||
        model.id === "phi-3-mini",
      install: {
        strategy:
          model.runtime === "ollama" ? "ollama-pull" : "cortex-download",
        ref: model.ollamaTag ?? model.id,
      },
    }),
  );

export function findLocalModelDescriptor(
  id: string,
): LocalModelDescriptor | undefined {
  return LOCAL_MODEL_CATALOG.find(
    (model) =>
      model.id === id ||
      model.runtimeModelId === id ||
      model.id.endsWith(`:${id}`),
  );
}

export function getLocalModelsByRuntime(
  runtime: LocalRuntimeKind,
): LocalModelDescriptor[] {
  return LOCAL_MODEL_CATALOG.filter((model) => model.runtime === runtime);
}

export function getLocalModelsWithFeature(
  feature: LocalModelFeature,
): LocalModelDescriptor[] {
  return LOCAL_MODEL_CATALOG.filter((model) =>
    model.features.includes(feature),
  );
}

export function getRecommendedLocalModels(): LocalModelDescriptor[] {
  return LOCAL_MODEL_CATALOG.filter((model) => model.recommended === true);
}
