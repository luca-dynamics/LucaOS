/**
 * Local Model Catalog
 * -------------------
 * A *projection* of `LOCAL_MODEL_DEFINITIONS` into the `LocalModelDescriptor`
 * shape the runtime adapters consume. It holds no model data of its own — there
 * used to be a second, hand-typed list here, and the two drifted (context
 * windows in particular). Adding a model now means editing exactly one file.
 *
 * The projection is deliberately narrow. It emits a descriptor only where a
 * `LocalRuntimeAdapter` exists to execute it, so every descriptor returned from
 * this module can actually be run. Definitions for `webllm` and `mediapipe`
 * models — which have no adapter — are therefore absent rather than listed and
 * unusable.
 */

import {
  LOCAL_MODEL_DEFINITIONS,
  type LocalModel,
} from "./LocalModelDefinitions";
import type {
  LocalModelDescriptor,
  LocalModelFeature,
  LocalModelInstallPlan,
  LocalRuntimeKind,
} from "./LocalModelTypes";

type ModelDefinition = Omit<LocalModel, "status" | "downloadProgress">;

/** The `LocalModel.runtime` values that name a runtime with a real adapter. */
type ExecutableRuntime = "ollama" | "internal";

/**
 * `LocalModel.runtime` speaks in Luca's own terms ("internal" = models Luca runs
 * itself rather than handing to Ollama); `LocalRuntimeKind` names the adapter.
 */
const RUNTIME_KIND: Record<ExecutableRuntime, LocalRuntimeKind> = {
  ollama: "ollama",
  internal: "cortex",
};

/**
 * Context window used when a definition does not state one. Deliberately the
 * smallest window any model in the catalog actually has, so a missing value
 * truncates early rather than overflowing a model's real limit. Definitions
 * should state the real number; this is a floor, not a default.
 */
const CONTEXT_WINDOW_FLOOR = 4096;

/**
 * Both `OllamaRuntime` and `CortexRuntime` implement `stream()` and both forward
 * and parse `tool_calls`, so these three hold for every descriptor either one
 * produces. `vision` is per-model and comes from the definition.
 */
const RUNTIME_FEATURES: LocalModelFeature[] = ["chat", "streaming", "tools"];

function installPlanFor(
  def: ModelDefinition,
  runtime: ExecutableRuntime,
): LocalModelInstallPlan {
  // A model the user has to fetch themselves cannot be described as a pull.
  if (def.manualArtifactRef) {
    return { strategy: "manual", ref: def.manualArtifactRef };
  }
  return runtime === "ollama"
    ? { strategy: "ollama-pull", ref: def.ollamaTag ?? def.id }
    : { strategy: "cortex-download", ref: def.id };
}

function featuresFor(def: ModelDefinition): LocalModelFeature[] {
  const features = [...RUNTIME_FEATURES];
  if (def.visionCapable) features.push("vision");
  return features;
}

function projectDescriptor(
  def: ModelDefinition,
  runtime: ExecutableRuntime,
  isPrimaryRuntime: boolean,
): LocalModelDescriptor {
  const runtimeModelId =
    runtime === "ollama" ? (def.ollamaTag ?? def.id) : def.id;
  const kind = RUNTIME_KIND[runtime];

  return {
    id: `${kind}:${runtimeModelId}`,
    displayName: def.name,
    runtime: kind,
    runtimeModelId,
    sizeBytes: def.size,
    minRamBytes: def.memoryRequirement,
    contextWindow: def.contextWindow ?? CONTEXT_WINDOW_FLOOR,
    features: featuresFor(def),
    // A recommendation is for the model as Luca delivers it, so it rides only
    // the primary runtime's descriptor — not every runtime that could run it.
    ...(isPrimaryRuntime && def.recommendedDefault ? { recommended: true } : {}),
    install: installPlanFor(def, runtime),
  };
}

function projectCatalog(
  definitions: readonly ModelDefinition[],
): LocalModelDescriptor[] {
  const descriptors: LocalModelDescriptor[] = [];
  const seen = new Set<string>();

  for (const def of definitions) {
    // Chat models only. Speech, vision-encoder, and embedding models are
    // installed and run through their own paths, not through a chat adapter.
    if (def.category !== "brain") continue;

    const runtimes: ExecutableRuntime[] = [
      def.runtime,
      ...(def.additionalRuntimes ?? []),
    ];

    for (const [index, runtime] of runtimes.entries()) {
      const descriptor = projectDescriptor(def, runtime, index === 0);
      // Two definitions naming the same runtime model would silently shadow one
      // another in every lookup below; keep the first and drop the duplicate.
      if (seen.has(descriptor.id)) continue;
      seen.add(descriptor.id);
      descriptors.push(descriptor);
    }
  }

  return descriptors;
}

export const LOCAL_MODEL_CATALOG: LocalModelDescriptor[] = projectCatalog(
  LOCAL_MODEL_DEFINITIONS,
);

export function findLocalModelDescriptor(
  id: string,
): LocalModelDescriptor | undefined {
  return LOCAL_MODEL_CATALOG.find(
    (model) => model.id === id || model.runtimeModelId === id,
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
