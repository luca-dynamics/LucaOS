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
 * Pure data + selectors. L2/L3 endpoint health and L5 catalog bridge
 * (`lucaLocalCatalogBridge`) consume this. It does not connect to or start any
 * model; it only describes them. Operational status still lives in
 * ModelManagerService / ModelRegistry.
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
const LLAMA_3_1: LucaModelLicense = {
  name: "Llama 3.1 Community License",
  url: "https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE",
  commercialUse: "conditional",
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
const QWEN: LucaModelLicense = {
  name: "Qwen License Agreement",
  url: "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct/blob/main/LICENSE",
  commercialUse: "conditional",
};
const MOONSHOT: LucaModelLicense = {
  name: "Moonshot AI Model License",
  url: "https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/LICENSE",
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

/** Ollama brain model catalog. Static descriptors only; operational status lives in ModelManagerService. */
export const OLLAMA_BRAIN_CATALOG: readonly LucaUnifiedModel[] = [
  {
    id: "gemma-4b",
    name: "Gemma 4B (Agentic)",
    description: "Google's 2026 breakthrough. Native tool-calling support in a compact 4B frame.",
    source: "ollama",
    sizeBytes: 4.2 * GB,
    minRamBytes: 8 * GB,
    capabilities: ["chat", "tools"],
    license: GEMMA,
    sourceUrl: "https://ollama.com/library/gemma4",
  },
  {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B",
    description: "Meta's efficient small model. Exceptional at native tool-calling and system automation.",
    source: "ollama",
    sizeBytes: 1 * GB,
    minRamBytes: 2 * GB,
    capabilities: ["chat", "tools"],
    license: LLAMA_3_2,
    sourceUrl: "https://ollama.com/library/llama3.2",
  },
  {
    id: "qwen-2.5-1.5b",
    name: "Qwen 2.5 1.5B (Edge Optimized)",
    description: "Highly accurate even on lower-end hardware. Perfect for 8 GB RAM systems.",
    source: "ollama",
    sizeBytes: 1.6 * GB,
    minRamBytes: 4 * GB,
    capabilities: ["chat", "code"],
    license: QWEN,
    sourceUrl: "https://ollama.com/library/qwen2.5",
  },
  {
    id: "hermes-3-3b",
    name: "Hermes 3 3B",
    description: "Lightweight sovereign persona specialist. Based on Llama 3.2. Runs on 8 GB RAM.",
    source: "ollama",
    sizeBytes: 2.2 * GB,
    minRamBytes: 6 * GB,
    capabilities: ["chat"],
    license: LLAMA_3_2,
    sourceUrl: "https://ollama.com/library/hermes3",
  },
  {
    id: "gemma-4-e2b",
    name: "Gemma 4 E2B (Mobile Optimized)",
    description: "Google's ultra-fast efficient model. Optimized for mobile and edge inference.",
    source: "ollama",
    sizeBytes: 1.2 * GB,
    minRamBytes: 4 * GB,
    capabilities: ["chat"],
    license: GEMMA,
    sourceUrl: "https://ollama.com/library/gemma4",
  },
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    description: "Alibaba's SOTA coding and reasoning model. Premier choice for complex agentic workflows.",
    source: "ollama",
    sizeBytes: 4.7 * GB,
    minRamBytes: 12 * GB,
    capabilities: ["chat", "code", "tools"],
    license: QWEN,
    sourceUrl: "https://ollama.com/library/qwen2.5",
    recommended: true,
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B v0.3",
    description: "The classic open-weight standard for efficiency and performance. Versatile and reliable.",
    source: "ollama",
    sizeBytes: 4.1 * GB,
    minRamBytes: 10 * GB,
    capabilities: ["chat", "code"],
    license: APACHE_2_0,
    sourceUrl: "https://ollama.com/library/mistral",
  },
  {
    id: "hermes-3-8b",
    name: "Hermes 3 8B",
    description: "Nous Research fine-tune of Llama 3.1. Exceptional instruction following and persona alignment.",
    source: "ollama",
    sizeBytes: 4.7 * GB,
    minRamBytes: 12 * GB,
    capabilities: ["chat", "tools"],
    license: LLAMA_3_1,
    sourceUrl: "https://ollama.com/library/hermes3",
  },
  {
    id: "qwen-3.5-7b",
    name: "Qwen 3.5 7B",
    description: "Alibaba's latest balanced model. Exceptional performance across reasoning tasks.",
    source: "ollama",
    sizeBytes: 4.5 * GB,
    minRamBytes: 12 * GB,
    capabilities: ["chat", "code", "tools"],
    license: QWEN,
    sourceUrl: "https://ollama.com/library/qwen3.5",
  },
  {
    id: "deepseek-r1-distill-7b",
    name: "DeepSeek R1 Distill 7B",
    description: "DeepSeek's distilled reasoning model. Exceptional at logic and mathematics.",
    source: "ollama",
    sizeBytes: 4.9 * GB,
    minRamBytes: 16 * GB,
    capabilities: ["chat", "code"],
    license: MIT,
    sourceUrl: "https://ollama.com/library/deepseek-r1",
  },
  {
    id: "glm-5-9b",
    name: "GLM-5 9B (Agentic Specialist)",
    description: "Zhipu AI's 2026 breakthrough in long-horizon reasoning and complex tool-use.",
    source: "ollama",
    sizeBytes: 5.8 * GB,
    minRamBytes: 14 * GB,
    capabilities: ["chat", "code", "tools"],
    license: APACHE_2_0,
    sourceUrl: "https://ollama.com/library/glm5",
  },
  {
    id: "kimi-k2.5-12b",
    name: "Kimi K2.5 12B (Visual Designer)",
    description: "Moonshot AI's specialist in visual-to-code generation and UI design workflows.",
    source: "ollama",
    sizeBytes: 7.9 * GB,
    minRamBytes: 16 * GB,
    capabilities: ["chat", "code", "vision"],
    license: MOONSHOT,
    sourceUrl: "https://ollama.com/library/kimi",
  },
  {
    id: "deepseek-r1-distill-14b",
    name: "DeepSeek R1 Distill 14B",
    description: "The logic powerhouse. Fine-tuned for mathematical certainty and zero-error reasoning.",
    source: "ollama",
    sizeBytes: 9.1 * GB,
    minRamBytes: 18 * GB,
    capabilities: ["chat", "code"],
    license: MIT,
    sourceUrl: "https://ollama.com/library/deepseek-r1",
  },
  {
    id: "qwopus-3.5-27b",
    name: "Qwopus 3.5 27B (Opus Reasoning)",
    description: "Qwen 3.5 enhanced with advanced reasoning trajectories. Pro-rig powerhouse.",
    source: "ollama",
    sizeBytes: 16.5 * GB,
    minRamBytes: 20 * GB,
    capabilities: ["chat", "code", "tools"],
    license: QWEN,
    sourceUrl: "https://ollama.com/library/qwopus",
  },
  {
    id: "qwen-3-32b",
    name: "Qwen 3 32B (Balanced Standard)",
    description: "The 2026 gold standard for local inference. Superior coding and multilingual reasoning.",
    source: "ollama",
    sizeBytes: 19.2 * GB,
    minRamBytes: 24 * GB,
    capabilities: ["chat", "code", "tools"],
    license: QWEN,
    sourceUrl: "https://ollama.com/library/qwen3",
  },
  {
    id: "gemma-4-31b",
    name: "Gemma 4 31B (Heavy Reasoning)",
    description: "DeepMind's state-of-the-art reasoning model for agentic workflows on high-end rigs.",
    source: "ollama",
    sizeBytes: 18 * GB,
    minRamBytes: 22 * GB,
    capabilities: ["chat", "code", "tools"],
    license: GEMMA,
    sourceUrl: "https://ollama.com/library/gemma4",
  },
];

/** WebLLM (MLC/WebGPU) model catalog. Static descriptors; status lives in ModelRegistry. */
export const WEBLLM_CATALOG: readonly LucaUnifiedModel[] = [
  {
    id: "gemma-2b-it",
    name: "Gemma 2B",
    description: "Google's compact, well-rounded assistant. Great balance of speed and capability.",
    source: "webllm",
    sizeBytes: 1.4 * GB,
    minRamBytes: 3 * GB,
    capabilities: ["chat"],
    license: GEMMA,
    sourceUrl: "https://huggingface.co/mlc-ai/gemma-2b-it-q4f16_1-MLC",
    recommended: true,
  },
  {
    id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
    name: "Phi-3 Mini 3.8B",
    description: "Microsoft's reasoning powerhouse. Excellent for coding and analysis via WebGPU.",
    source: "webllm",
    sizeBytes: 2.3 * GB,
    minRamBytes: 5 * GB,
    capabilities: ["chat", "code"],
    license: MIT,
    sourceUrl: "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B",
    description: "Meta's efficient small model. Fast and capable for general tasks via WebGPU.",
    source: "webllm",
    sizeBytes: 1 * GB,
    minRamBytes: 3 * GB,
    capabilities: ["chat"],
    license: LLAMA_3_2,
    sourceUrl: "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    name: "SmolLM2 1.7B",
    description: "HuggingFace's tiny but mighty model. Ultra-fast on any device via WebGPU.",
    source: "webllm",
    sizeBytes: 1.2 * GB,
    minRamBytes: 3 * GB,
    capabilities: ["chat"],
    license: APACHE_2_0,
    sourceUrl: "https://huggingface.co/mlc-ai/SmolLM2-1.7B-Instruct-q4f16_1-MLC",
  },
];

/** All unified models across all local runtimes. */
export function getLucaUnifiedModels(
  source?: LucaModelSource,
): LucaUnifiedModel[] {
  const all = [
    ...LOCALAI_CURATED_CATALOG,
    ...OLLAMA_BRAIN_CATALOG,
    ...WEBLLM_CATALOG,
  ];
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
