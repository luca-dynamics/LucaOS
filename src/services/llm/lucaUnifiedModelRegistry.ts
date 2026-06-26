/**
 * lucaUnifiedModelRegistry — the single typed source of truth a future model
 * registry can consolidate around (per docs/luca-local-models-backend-audit.md,
 * L1).
 *
 * Today Luca keeps parallel hand-curated catalogs (Ollama in
 * ModelManagerService, WebLLM in services/llm/ModelRegistry). This module adds
 * one typed shape that describes a model regardless of runtime — including the
 * curated, static LocalAI slice imported as OpenAI-compatible entries — with the
 * two fields the audit flagged as missing for "industrial-strong" use:
 * per-model RAM requirement (for honest hardware-fit) and license/provenance.
 *
 * Pure and dormant: data + pure selectors only. It imports no React/UI, reads
 * no state, performs no I/O, and is wired nowhere yet (L2+ consume it). It does
 * not connect to or start any model; it only describes them.
 */

export type LucaModelSource = "ollama" | "webllm" | "openai-compatible";

/** Conservative, honest commercial-use signal — verify per model before relying on it. */
export type LucaModelCommercialUse = "yes" | "conditional" | "no";

export interface LucaModelLicense {
  /** Human / SPDX-ish name, e.g. "Apache-2.0", "MIT", "Llama 3.2 Community". */
  name: string;
  /** Where the license terms live. */
  url?: string;
  /** Conservative commercial-use signal; "conditional" = allowed under terms/limits. */
  commercialUse: LucaModelCommercialUse;
}

export interface LucaUnifiedModel {
  id: string;
  name: string;
  description: string;
  source: LucaModelSource;
  /** Approximate on-disk/download size in bytes, when known. */
  sizeBytes?: number;
  /** Minimum system RAM (bytes) for a usable experience, when known. */
  minRamBytes?: number;
  /** Coarse capability tags, e.g. "chat", "code", "vision", "tools". */
  capabilities?: string[];
  license: LucaModelLicense;
  /** Provenance: where this entry was sourced from (gallery/model card URL). */
  sourceUrl: string;
  recommended?: boolean;
}

const GB = 1_000_000_000;

const APACHE_2_0: LucaModelLicense = {
  name: "Apache-2.0",
  url: "https://www.apache.org/licenses/LICENSE-2.0",
  commercialUse: "yes",
};
const MIT: LucaModelLicense = {
  name: "MIT",
  url: "https://opensource.org/license/mit",
  commercialUse: "yes",
};
const LLAMA_3_2: LucaModelLicense = {
  name: "Llama 3.2 Community License",
  url: "https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE",
  commercialUse: "conditional",
};
const GEMMA: LucaModelLicense = {
  name: "Gemma Terms of Use",
  url: "https://ai.google.dev/gemma/terms",
  commercialUse: "conditional",
};

/**
 * Curated, static slice of the LocalAI gallery, captured as OpenAI-compatible
 * entries. A small reviewed allowlist (not a full mirror); each entry records
 * its license and source so nothing ships without provenance. Connect via the
 * existing OpenAI-compatible adapter + a LocalAI base URL (L2/L3).
 */
export const LOCALAI_CURATED_CATALOG: readonly LucaUnifiedModel[] = [
  {
    id: "qwen2.5-7b-instruct",
    name: "Qwen2.5 7B Instruct",
    description: "Strong general + coding model; a capable default on higher-RAM machines.",
    source: "openai-compatible",
    sizeBytes: 4.7 * GB,
    minRamBytes: 8 * GB,
    capabilities: ["chat", "code", "tools"],
    license: APACHE_2_0,
    sourceUrl: "https://models.localai.io/",
    recommended: true,
  },
  {
    id: "llama-3.2-3b-instruct",
    name: "Llama 3.2 3B Instruct",
    description: "Balanced small assistant for everyday tasks.",
    source: "openai-compatible",
    sizeBytes: 2 * GB,
    minRamBytes: 6 * GB,
    capabilities: ["chat"],
    license: LLAMA_3_2,
    sourceUrl: "https://models.localai.io/",
  },
  {
    id: "llama-3.2-1b-instruct",
    name: "Llama 3.2 1B Instruct",
    description: "Lightweight model for constrained machines.",
    source: "openai-compatible",
    sizeBytes: 0.8 * GB,
    minRamBytes: 4 * GB,
    capabilities: ["chat"],
    license: LLAMA_3_2,
    sourceUrl: "https://models.localai.io/",
  },
  {
    id: "phi-3-mini-4k-instruct",
    name: "Phi-3 Mini 4K Instruct",
    description: "Microsoft's compact reasoning model; good for coding and analysis.",
    source: "openai-compatible",
    sizeBytes: 2.3 * GB,
    minRamBytes: 6 * GB,
    capabilities: ["chat", "code"],
    license: MIT,
    sourceUrl: "https://models.localai.io/",
  },
  {
    id: "mistral-7b-instruct",
    name: "Mistral 7B Instruct",
    description: "Well-rounded 7B instruct model with permissive licensing.",
    source: "openai-compatible",
    sizeBytes: 4.1 * GB,
    minRamBytes: 8 * GB,
    capabilities: ["chat", "code"],
    license: APACHE_2_0,
    sourceUrl: "https://models.localai.io/",
  },
  {
    id: "gemma-2-2b-instruct",
    name: "Gemma 2 2B Instruct",
    description: "Google's compact assistant; efficient on modest hardware.",
    source: "openai-compatible",
    sizeBytes: 1.6 * GB,
    minRamBytes: 4 * GB,
    capabilities: ["chat"],
    license: GEMMA,
    sourceUrl: "https://models.localai.io/",
  },
];

/** All unified models (currently the curated LocalAI slice; Ollama/WebLLM migrate in at L5). */
export function getLucaUnifiedModels(
  source?: LucaModelSource,
): LucaUnifiedModel[] {
  const all = [...LOCALAI_CURATED_CATALOG];
  return source ? all.filter((model) => model.source === source) : all;
}

export function findLucaUnifiedModel(id: string): LucaUnifiedModel | undefined {
  return getLucaUnifiedModels().find((model) => model.id === id);
}

/** Models whose minimum RAM fits within the given system RAM (honest hardware-fit). */
export function getLucaUnifiedModelsForRam(
  systemRamBytes: number,
): LucaUnifiedModel[] {
  return getLucaUnifiedModels().filter(
    (model) =>
      model.minRamBytes === undefined || model.minRamBytes <= systemRamBytes,
  );
}
