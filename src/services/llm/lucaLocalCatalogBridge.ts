/**
 * L5 local catalog bridge — single read API over the parallel local-model catalogs.
 *
 * Sources still exist independently (operational status lives in ModelManager /
 * ModelRegistry / runtime health). This module does not delete those lists; it
 * projects them into one view so product code can stop hand-picking catalogs.
 *
 * Catalogs:
 * 1) lucaUnifiedModelRegistry — ollama / webllm / openai-compatible (license + RAM)
 * 2) local-models/LocalModelCatalog — runtime facade (ollama/cortex/webllm/mediapipe)
 * 3) ModelRegistry OFFLINE_MODELS — browser offline install descriptors
 *
 * Pure projection + selectors. No I/O, no model load, no provider routing change.
 */

import {
  findLocalModelDescriptor,
  LOCAL_MODEL_CATALOG,
} from "../local-models/LocalModelCatalog";
import type { LocalModelDescriptor } from "../local-models/LocalModelTypes";
import {
  findLucaUnifiedModel,
  getLucaUnifiedModels,
  type LucaModelSource,
  type LucaUnifiedModel,
} from "./lucaUnifiedModelRegistry";

/** Minimal offline row shape (matches ModelRegistry.OfflineModel). */
export interface OfflineModelCatalogRow {
  id: string;
  name: string;
  description: string;
  size: number;
  downloadUrl: string;
  runtime: "mediapipe" | "webllm" | "onnx";
  chatTemplate?: "gemma" | "chatml" | "llama" | "phi";
  quantization?: string;
  recommended?: boolean;
}

export type LocalCatalogOrigin =
  | "unified"
  | "runtime_facade"
  | "offline_registry";

// Must cover every LocalRuntimeKind a descriptor can carry, because the view
// copies `descriptor.runtime` through verbatim -- see the note in
// mapDescriptorToUnified: `source` is a lossy projection for typing, and
// view.runtime is the field that carries the real kind.
export type LocalCatalogRuntime =
  | LucaModelSource
  | "cortex"
  | "mediapipe"
  | "native-gguf"
  | "onnx";

export interface LocalCatalogViewEntry {
  id: string;
  name: string;
  description: string;
  runtime: LocalCatalogRuntime;
  runtimeModelId?: string;
  sizeBytes?: number;
  minRamBytes?: number;
  capabilities: string[];
  recommended?: boolean;
  origins: LocalCatalogOrigin[];
  /** Present when an offline browser install descriptor exists. */
  offline?: OfflineModelCatalogRow;
  /** Present when runtime facade descriptor exists. */
  runtimeDescriptor?: LocalModelDescriptor;
  /** Present when unified license/provenance entry exists. */
  unified?: LucaUnifiedModel;
}

export interface LocalCatalogDivergenceReport {
  unifiedCount: number;
  runtimeFacadeCount: number;
  offlineRegistryCount: number;
  /** Runtime facade models with no matching unified entry. */
  facadeOnlyIds: string[];
  /** Offline registry models with no matching unified entry. */
  offlineOnlyIds: string[];
  /** Unified entries with no facade and no offline match. */
  unifiedOnlyIds: string[];
  /** Total unique ids in the merged view. */
  mergedCount: number;
}

const RUNTIME_LICENSE = {
  name: "See model provider terms",
  commercialUse: "conditional" as const,
};

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}

function idsMatch(a: string, b: string): boolean {
  return normalizeId(a) === normalizeId(b);
}

function runtimeFromUnified(source: LucaModelSource): LocalCatalogRuntime {
  return source;
}

function mapDescriptorToUnified(
  descriptor: LocalModelDescriptor,
): LucaUnifiedModel {
  const source: LucaModelSource =
    descriptor.runtime === "ollama"
      ? "ollama"
      : descriptor.runtime === "webllm"
        ? "webllm"
        : descriptor.runtime === "openai-compatible"
          ? "openai-compatible"
          : // cortex/mediapipe projected as ollama/webllm-adjacent tags for typing;
            // view.runtime carries the real kind.
            descriptor.runtime === "mediapipe"
            ? "webllm"
            : "ollama";

  return {
    id: descriptor.runtimeModelId || descriptor.id,
    name: descriptor.displayName,
    description: `${descriptor.displayName} (${descriptor.runtime} runtime facade)`,
    source,
    sizeBytes: descriptor.sizeBytes,
    minRamBytes: descriptor.minRamBytes,
    capabilities: [...descriptor.features],
    license: RUNTIME_LICENSE,
    sourceUrl: `luca-runtime-catalog://${descriptor.id}`,
    recommended: descriptor.recommended,
  };
}

function mapOfflineToPartial(model: OfflineModelCatalogRow): {
  id: string;
  name: string;
  description: string;
  runtime: LocalCatalogRuntime;
  sizeBytes?: number;
  capabilities: string[];
  recommended?: boolean;
} {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    runtime: model.runtime,
    sizeBytes: model.size,
    capabilities: ["chat"],
    recommended: model.recommended,
  };
}

function pushOrigin(
  map: Map<string, LocalCatalogViewEntry>,
  key: string,
  patch: Partial<LocalCatalogViewEntry> &
    Pick<LocalCatalogViewEntry, "id" | "name" | "description" | "runtime">,
  origin: LocalCatalogOrigin,
): void {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      capabilities: [],
      origins: [origin],
      ...patch,
    });
    return;
  }
  if (!existing.origins.includes(origin)) existing.origins.push(origin);
  existing.name = existing.name || patch.name;
  existing.description = existing.description || patch.description;
  existing.runtime = patch.runtime || existing.runtime;
  existing.sizeBytes = existing.sizeBytes ?? patch.sizeBytes;
  existing.minRamBytes = existing.minRamBytes ?? patch.minRamBytes;
  existing.runtimeModelId = existing.runtimeModelId ?? patch.runtimeModelId;
  existing.recommended = existing.recommended || patch.recommended;
  if (patch.capabilities?.length) {
    existing.capabilities = Array.from(
      new Set([...existing.capabilities, ...patch.capabilities]),
    );
  }
  if (patch.unified) existing.unified = patch.unified;
  if (patch.runtimeDescriptor) existing.runtimeDescriptor = patch.runtimeDescriptor;
  if (patch.offline) existing.offline = patch.offline;
}

function keyFor(
  id: string,
  runtimeModelId?: string,
): string {
  return normalizeId(runtimeModelId || id);
}

/**
 * Single merged catalog view across unified + runtime facade + offline registry.
 * Pass offline rows from ModelRegistry to avoid a circular module import.
 */
export function listLocalCatalogView(
  offlineModels: readonly OfflineModelCatalogRow[] = [],
): LocalCatalogViewEntry[] {
  const map = new Map<string, LocalCatalogViewEntry>();

  for (const unified of getLucaUnifiedModels()) {
    pushOrigin(
      map,
      keyFor(unified.id),
      {
        id: unified.id,
        name: unified.name,
        description: unified.description,
        runtime: runtimeFromUnified(unified.source),
        sizeBytes: unified.sizeBytes,
        minRamBytes: unified.minRamBytes,
        capabilities: [...(unified.capabilities ?? [])],
        recommended: unified.recommended,
        unified,
      },
      "unified",
    );
  }

  for (const descriptor of LOCAL_MODEL_CATALOG) {
    const unifiedMatch =
      findLucaUnifiedModel(descriptor.runtimeModelId) ||
      findLucaUnifiedModel(descriptor.id.replace(/^[^:]+:/, ""));
    const projected = unifiedMatch ?? mapDescriptorToUnified(descriptor);
    pushOrigin(
      map,
      keyFor(descriptor.runtimeModelId, descriptor.id),
      {
        id: descriptor.runtimeModelId || descriptor.id,
        name: descriptor.displayName,
        description: projected.description,
        runtime: descriptor.runtime,
        runtimeModelId: descriptor.runtimeModelId,
        sizeBytes: descriptor.sizeBytes ?? projected.sizeBytes,
        minRamBytes: descriptor.minRamBytes ?? projected.minRamBytes,
        capabilities: [...descriptor.features],
        recommended: descriptor.recommended,
        runtimeDescriptor: descriptor,
        unified: unifiedMatch ?? projected,
      },
      "runtime_facade",
    );
  }

  for (const offline of offlineModels) {
    const partial = mapOfflineToPartial(offline);
    const facade = findLocalModelDescriptor(offline.id);
    pushOrigin(
      map,
      keyFor(offline.id),
      {
        ...partial,
        runtimeModelId: offline.id,
        offline,
        runtimeDescriptor: facade,
      },
      "offline_registry",
    );
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Divergence report for L5 migration / diagnostics. */
export function getLocalCatalogDivergenceReport(
  offlineModels: readonly OfflineModelCatalogRow[] = [],
): LocalCatalogDivergenceReport {
  const unified = getLucaUnifiedModels();
  const facade = LOCAL_MODEL_CATALOG;
  const offline = offlineModels;
  const merged = listLocalCatalogView(offlineModels);

  const unifiedIds = new Set(unified.map((m) => normalizeId(m.id)));
  const facadeIds = facade.map((m) => normalizeId(m.runtimeModelId || m.id));
  const offlineIds = offline.map((m) => normalizeId(m.id));

  const facadeOnlyIds = facade
    .filter((m) => {
      const id = normalizeId(m.runtimeModelId || m.id);
      const bare = normalizeId(m.id.replace(/^[^:]+:/, ""));
      return !unifiedIds.has(id) && !unifiedIds.has(bare) && ![...unifiedIds].some((u) => idsMatch(u, m.runtimeModelId) || idsMatch(u, bare));
    })
    .map((m) => m.id);

  const offlineOnlyIds = offline
    .filter((m) => !unifiedIds.has(normalizeId(m.id)))
    .map((m) => m.id);

  const facadeSet = new Set(facadeIds);
  const offlineSet = new Set(offlineIds);
  const unifiedOnlyIds = unified
    .filter((m) => {
      const id = normalizeId(m.id);
      return !facadeSet.has(id) && !offlineSet.has(id);
    })
    .map((m) => m.id);

  return {
    unifiedCount: unified.length,
    runtimeFacadeCount: facade.length,
    offlineRegistryCount: offline.length,
    facadeOnlyIds,
    offlineOnlyIds,
    unifiedOnlyIds,
    mergedCount: merged.length,
  };
}

/**
 * Browser offline catalog derived from unified webllm + leftover offline rows.
 * Prefer unified metadata; keep offline downloadUrl/runtime when present.
 */
export function getOfflineModelsFromLocalCatalog(
  offlineModels: readonly OfflineModelCatalogRow[],
): OfflineModelCatalogRow[] {
  const offlineById = new Map(
    offlineModels.map((model) => [normalizeId(model.id), model] as const),
  );
  const webllm = getLucaUnifiedModels("webllm");
  const fromUnified: OfflineModelCatalogRow[] = webllm.map((model) => {
    const existing = offlineById.get(normalizeId(model.id));
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      size: model.sizeBytes ?? existing?.size ?? 0,
      downloadUrl: existing?.downloadUrl ?? "",
      runtime: existing?.runtime ?? "webllm",
      chatTemplate: existing?.chatTemplate,
      quantization: existing?.quantization,
      recommended: model.recommended ?? existing?.recommended,
    };
  });

  // Keep mediapipe/onnx offline-only rows that unified webllm list does not cover.
  for (const offline of offlineModels) {
    if (fromUnified.some((m) => idsMatch(m.id, offline.id))) continue;
    fromUnified.push(offline);
  }
  return fromUnified;
}

/** Filter merged catalog by runtime kind. */
export function listLocalCatalogByRuntime(
  runtime: LocalCatalogRuntime,
  offlineModels: readonly OfflineModelCatalogRow[] = [],
): LocalCatalogViewEntry[] {
  return listLocalCatalogView(offlineModels).filter(
    (entry) => entry.runtime === runtime,
  );
}

/** Hardware-fit over the merged view. */
export function listLocalCatalogForRam(
  systemRamBytes: number,
  offlineModels: readonly OfflineModelCatalogRow[] = [],
): LocalCatalogViewEntry[] {
  return listLocalCatalogView(offlineModels).filter(
    (entry) =>
      entry.minRamBytes === undefined || entry.minRamBytes <= systemRamBytes,
  );
}

/**
 * Product-facing display metadata for any local catalog id
 * (desktop brain, offline browser, LocalAI, runtime facade).
 * Prefer this over importing lucaUnifiedModelRegistry / LOCAL_MODEL_CATALOG
 * directly from UI surfaces.
 */
export interface LocalCatalogDisplayMetadata {
  id: string;
  name?: string;
  description?: string;
  minRamBytes?: number;
  sizeBytes?: number;
  licenseName?: string;
  /** From unified license when known: yes | no | conditional */
  commercialUse?: "yes" | "no" | "conditional";
  sourceUrl?: string;
  sourceLabel?: string;
  recommended?: boolean;
  origins: LocalCatalogOrigin[];
}

/**
 * Resolve display metadata for a model id.
 * Prefers unified ollama/localai/webllm rows, then runtime facade + offline.
 */
export function resolveBrainCatalogMetadata(
  modelId: string,
): LocalCatalogDisplayMetadata | undefined {
  const needle = modelId.trim().toLowerCase();
  if (!needle) return undefined;

  const unified = findLucaUnifiedModel(modelId);
  const view = listLocalCatalogView().find(
    (entry) =>
      entry.id.toLowerCase() === needle ||
      entry.runtimeModelId?.toLowerCase() === needle ||
      entry.id.toLowerCase().endsWith(needle) ||
      entry.runtimeModelId?.toLowerCase().includes(needle),
  );

  if (!unified && !view) return undefined;

  const license =
    unified?.license ?? view?.unified?.license;
  const runtimeLabel =
    view?.runtime === "ollama"
      ? "Ollama"
      : view?.runtime === "webllm"
        ? "WebGPU"
        : view?.runtime === "openai-compatible"
          ? "OpenAI-compatible"
          : view?.runtime === "cortex"
            ? "Cortex"
            : view?.runtime === "mediapipe"
              ? "MediaPipe"
              : unified?.source === "ollama"
                ? "Ollama"
                : unified?.source === "webllm"
                  ? "WebGPU"
                  : unified?.source === "openai-compatible"
                    ? "OpenAI-compatible"
                    : undefined;

  return {
    id: unified?.id ?? view?.id ?? modelId,
    name: unified?.name ?? view?.name,
    description: unified?.description ?? view?.description,
    minRamBytes: unified?.minRamBytes ?? view?.minRamBytes,
    sizeBytes: unified?.sizeBytes ?? view?.sizeBytes,
    licenseName: license?.name,
    commercialUse: license?.commercialUse,
    sourceUrl: unified?.sourceUrl ?? view?.unified?.sourceUrl,
    sourceLabel: runtimeLabel,
    recommended: unified?.recommended ?? view?.recommended,
    origins: view?.origins ?? (unified ? (["unified"] as LocalCatalogOrigin[]) : []),
  };
}

/** Alias — product code should treat the bridge as the local-catalog SoT reader. */
export const resolveLocalCatalogMetadata = resolveBrainCatalogMetadata;

/**
 * Recommended models from the merged catalog view (for pickers / onboarding).
 */
export function listRecommendedLocalCatalog(
  offlineModels: readonly OfflineModelCatalogRow[] = [],
): LocalCatalogViewEntry[] {
  return listLocalCatalogView(offlineModels).filter((entry) => entry.recommended);
}
