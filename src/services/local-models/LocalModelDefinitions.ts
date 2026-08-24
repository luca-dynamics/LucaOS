/**
 * Local Model Definitions
 * -----------------------
 * The canonical list of every local model Luca knows about, and nothing else.
 *
 * This module is deliberately a **leaf**: it imports nothing. Both consumers
 * depend on it and not on each other —
 * `LocalModelLibrary` (the lifecycle service: download, delete, VRAM guard,
 * canary) and `LocalModelCatalog` (the projection into the descriptor shape the
 * runtime adapters consume). Keeping the data here is what stops that pair from
 * forming an import cycle through `RuntimeRegistry`.
 */

export interface LocalModel {
  id: string;
  name: string;
  description: string;
  size: number; // bytes
  sizeFormatted: string;
  category: "brain" | "vision" | "tts" | "agent" | "stt" | "embedding";
  status: "not_downloaded" | "downloading" | "ready" | "error" | "unsupported";
  downloadProgress?: number; // 0-100
  platforms: ("desktop" | "mobile")[]; // Which platforms support this model
  memoryRequirement?: number; // Minimum RAM in bytes
  performanceRank?: number; // 0-10 (10 = highest accuracy/heavy, 1 = fastest/light)
  unsupportedReason?: string; // Why the model is unsupported on this platform
  vramStatus?: "safe" | "warning" | "critical"; // VRAM Guard status
  vramWarning?: string; // Human readable warning for the UI
  policyRecommendation?: "RECOMMENDED" | "RESTRICTED" | "WARNING" | "OPTIMAL";
  policyReason?: string;
  runtime: "ollama" | "internal";
  ollamaTag?: string; // Central runtime tag for Ollama modules
  /**
   * The model's real context window in tokens. Read straight through by
   * `LocalModelCatalog`'s projection — never substitute a uniform default here,
   * because chunking and truncation decisions depend on it. Left unset for
   * models whose published window we cannot verify; the projection then applies
   * a documented conservative floor rather than an invented number.
   */
  contextWindow?: number;
  /**
   * Other runtimes that can execute this same model. The projection emits one
   * descriptor per runtime, so a single definition covers e.g. Llama 3.2 1B run
   * under Ollama *and* under Cortex without duplicating the lifecycle entry.
   */
  additionalRuntimes?: ("ollama" | "internal")[];
  /**
   * Published artifact reference for models the user installs by hand (a
   * HuggingFace repo id, say). Its presence is what makes the projection emit a
   * `manual` install strategy instead of a runtime pull/download.
   */
  manualArtifactRef?: string;
  /** Brain model that accepts images alongside text (multimodal chat). */
  visionCapable?: boolean;
  /**
   * One of the small, fast models Luca offers as a safe first choice. Projected
   * onto the descriptor's `recommended` flag — and only onto the descriptor for
   * the model's *primary* runtime, since the recommendation is for the model as
   * Luca actually delivers it.
   */
  recommendedDefault?: boolean;
  catalogStatus?:
    | "verified"
    | "installable"
    | "planned"
    | "experimental"
    | "unknown";
  catalogWarning?: string;
  canary?: {
    passed: boolean;
    response: string;
    latency_ms: number;
    timestamp: number;
    error?: string;
  };
}

// Model definitions
const VERIFIED_OLLAMA_TAGS = new Set([
  "llama3.2:1b",
  "llama3.2:3b",
  "qwen2.5:7b",
  "gemma3:4b",
  "deepseek-r1:7b",
  "mistral:7b",
  "hermes3:8b",
  "qwen2.5:1.5b",
  "hermes3:3b",
  "deepseek-r1:14b",
]);

const KNOWN_INTERNAL_MODEL_IDS = new Set([
  "whisper-tiny",
  "whisper-v3-turbo",
  "piper-amy",
  "kokoro-82m",
  "nomic-embed-text",
  "bge-large-en",
]);

export function inferCatalogStatus(
  def: Omit<LocalModel, "status" | "downloadProgress">,
): NonNullable<LocalModel["catalogStatus"]> {
  if (def.catalogStatus) return def.catalogStatus;
  if (def.runtime === "ollama") {
    if (def.ollamaTag && VERIFIED_OLLAMA_TAGS.has(def.ollamaTag))
      return "verified";
    return "planned";
  }
  if (KNOWN_INTERNAL_MODEL_IDS.has(def.id)) return "verified";
  return "planned";
}

export function catalogWarningFor(
  status: NonNullable<LocalModel["catalogStatus"]>,
  def: Omit<LocalModel, "status" | "downloadProgress">,
): string | undefined {
  if (status === "verified" || status === "installable") return undefined;
  if (status === "planned")
    return `${def.name} is in Luca's catalog but its runtime tag/artifact is not verified; it is treated as planned until detected locally.`;
  if (status === "experimental")
    return `${def.name} is experimental and should be treated as opt-in.`;
  return `${def.name} has unknown distribution readiness.`;
}

/**
 * The canonical local model list. Exported because `LocalModelCatalog` projects
 * it into runtime descriptors — this is the one place a local model is declared.
 */
export const LOCAL_MODEL_DEFINITIONS: Omit<
  LocalModel,
  "status" | "downloadProgress"
>[] = [
  // ===== BRAIN MODELS (Chat & Reasoning) =====
  {
    id: "gemma-4b",
    name: "Gemma 4B (Agentic)",
    description:
      "Google's 2026 breakthrough. Native tool-calling support in a compact 4B frame. (Sovereign Tools Ready).",
    size: 4_200_000_000,
    sizeFormatted: "4.2 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 7, // Optimized for Intel and M1/M2/M3 entry-level
    memoryRequirement: 8_000_000_000,
    runtime: "ollama",
    ollamaTag: "gemma4:4b",
  },
  {
    id: "gemma-2b",
    name: "Gemma 2B",
    description:
      "Google's lightweight brain for mobile. Optimized for low-latency offline conversations.",
    size: 2_200_000_000,
    sizeFormatted: "2.1 GB",
    category: "brain",
    platforms: ["mobile"],
    performanceRank: 6,
    memoryRequirement: 4_000_000_000,
    runtime: "internal",
    contextWindow: 8192,
  },
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini 3.8B",
    description:
      "Microsoft's reasoning specialist for mobile. High performance, zero-gate access.",
    size: 2_300_000_000,
    sizeFormatted: "2.3 GB",
    category: "brain",
    platforms: ["mobile"],
    performanceRank: 8,
    memoryRequirement: 8_000_000_000,
    runtime: "internal",
    contextWindow: 4096,
  },
  {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B",
    description:
      "Meta's efficient small model. Exceptional at native tool-calling and system automation tasks.",
    size: 1_000_000_000,
    sizeFormatted: "1.0 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 5,
    memoryRequirement: 2_000_000_000,
    runtime: "ollama",
    ollamaTag: "llama3.2:1b",
    contextWindow: 131072,
    // Also shipped as a GGUF the internal runtime can load directly, so the
    // projection emits one descriptor per runtime rather than picking a winner.
    additionalRuntimes: ["internal"],
    recommendedDefault: true,
  },
  {
    id: "llama-3.2-3b",
    name: "Llama 3.2 3B",
    description:
      "Meta's mid-size instruct model. Stronger reasoning than the 1B while still fitting a laptop.",
    size: 2_000_000_000,
    sizeFormatted: "2.0 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 6,
    memoryRequirement: 4_000_000_000,
    runtime: "ollama",
    ollamaTag: "llama3.2:3b",
    contextWindow: 131072,
    recommendedDefault: true,
  },
  {
    id: "gemma-3-4b",
    name: "Gemma 3 4B",
    description:
      "Google's Gemma 3 4B. Handles text and images, so it is the vision-capable option in the local set.",
    size: 3_300_000_000,
    sizeFormatted: "3.3 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 7,
    memoryRequirement: 6_000_000_000,
    runtime: "ollama",
    ollamaTag: "gemma3:4b",
    contextWindow: 131072,
    visionCapable: true,
  },
  {
    id: "lfm2.5-230m",
    name: "Liquid LFM2.5 230M",
    description:
      "Liquid AI's 230M GGUF. Small enough to stay resident, used for fast local drafting.",
    size: 459_401_112,
    sizeFormatted: "459 MB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 3,
    memoryRequirement: 1_000_000_000,
    runtime: "internal",
    contextWindow: 32768,
    manualArtifactRef: "LiquidAI/LFM2.5-230M-GGUF",
    recommendedDefault: true,
  },
  {
    id: "smollm2-1.7b",
    name: "SmolLM2 1.7B",
    description:
      "HuggingFace's ultra-lightweight mobile brain. Exceptional speed on constrained hardware.",
    size: 1_200_000_000,
    sizeFormatted: "1.2 GB",
    category: "brain",
    platforms: ["mobile"],
    performanceRank: 4,
    memoryRequirement: 2_000_000_000,
    runtime: "internal",
    contextWindow: 8192,
  },
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    description:
      "Alibaba's SOTA coding & reasoning model. Premier choice for complex multi-tool agentic workflows.",
    size: 4_700_000_000,
    sizeFormatted: "4.7 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 9, // Heavy reasoning for high-end Desktop only
    memoryRequirement: 12_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen2.5:7b",
    contextWindow: 32768,
  },
  {
    id: "deepseek-r1-distill-7b",
    name: "DeepSeek R1 Distill 7B",
    description:
      "DeepSeek's distilled reasoning model. Exceptional logic & math.",
    size: 4_900_000_000,
    sizeFormatted: "4.9 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 16_000_000_000,
    runtime: "ollama",
    ollamaTag: "deepseek-r1:7b",
    contextWindow: 131072,
  },
  {
    id: "gemma-4-e2b",
    name: "Gemma 4 E2B (Mobile Optimized)",
    description:
      "Google's ultra-fast efficient model. Optimized for mobile and edge inference.",
    size: 1_200_000_000,
    sizeFormatted: "1.2 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 4,
    memoryRequirement: 4_000_000_000,
    runtime: "ollama",
    ollamaTag: "gemma4:e2b",
  },
  {
    id: "gemma-4-31b",
    name: "Gemma 4 31B (Heavy Reasoning)",
    description:
      "DeepMind's state-of-the-art reasoning model for agentic workflows.",
    size: 18_000_000_000,
    sizeFormatted: "18.0 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 22_000_000_000,
    runtime: "ollama",
    ollamaTag: "gemma4:31b",
  },
  {
    id: "qwen-3.5-7b",
    name: "Qwen 3.5 7B",
    description: "Alibaba's latest balanced model. Exceptional performance.",
    size: 4_500_000_000,
    sizeFormatted: "4.5 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 7,
    memoryRequirement: 12_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen3.5:7b",
  },
  {
    id: "qwopus-3.5-27b",
    name: "Qwopus 3.5 27B (Opus Reasoning)",
    description:
      "Qwen 3.5 enhanced with Claude 4.6 Opus reasoning trajectories.",
    size: 16_500_000_000,
    sizeFormatted: "16.5 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 20_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwopus:27b",
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B v0.3",
    description:
      "The classic open-weight standard for efficiency and performance. Versatile and reliable.",
    size: 4_100_000_000,
    sizeFormatted: "4.1 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 7,
    memoryRequirement: 10_000_000_000,
    runtime: "ollama",
    ollamaTag: "mistral:7b",
    contextWindow: 32768,
  },
  {
    id: "hermes-3-8b",
    name: "Hermes 3 (8B)",
    description:
      "Nous Research fine-tune of Llama 3.1. Exceptional instruction following and sovereign persona alignment.",
    size: 4_700_000_000,
    sizeFormatted: "4.7 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 12_000_000_000,
    runtime: "ollama",
    ollamaTag: "hermes3:8b",
    contextWindow: 131072,
  },
  {
    id: "qwen-2.5-1.5b",
    name: "Qwen 2.5 1.5B (Edge Optimized)",
    description:
      "Highly accurate even on lower-end hardware. Perfect for 8GB RAM systems and Intel Macs.",
    size: 1_600_000_000,
    sizeFormatted: "1.6 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 6,
    memoryRequirement: 4_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen2.5:1.5b",
    contextWindow: 32768,
  },
  {
    id: "hermes-3-3b",
    name: "Hermes 3 (3B)",
    description:
      "The lightweight sovereign persona specialist. Based on Llama 3.2. Runs smoothly on 8GB RAM.",
    size: 2_200_000_000,
    sizeFormatted: "2.2 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 7,
    memoryRequirement: 6_000_000_000,
    runtime: "ollama",
    ollamaTag: "hermes3:3b",
    contextWindow: 131072,
  },
  {
    id: "glm-5-9b",
    name: "GLM-5 9B (Agentic Specialist)",
    description:
      "Zhipu AI's 2026 breakthrough in long-horizon reasoning. Exceptional at complex tool-use and systems engineering.",
    size: 5_800_000_000,
    sizeFormatted: "5.8 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 14_000_000_000,
    runtime: "ollama",
    ollamaTag: "glm5:9b",
  },
  {
    id: "qwen-3-32b",
    name: "Qwen 3 32B (Balanced Standard)",
    description:
      "The 2026 gold standard for local inference. Superior coding and multilingual reasoning for pro rigs.",
    size: 19_200_000_000,
    sizeFormatted: "19.2 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 24_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen3:32b",
    contextWindow: 32768,
  },
  {
    id: "kimi-k2.5-12b",
    name: "Kimi K2.5 12B (Visual Designer)",
    description:
      "Moonshot AI's specialist in visual-to-code generation and UI design agentic workflows.",
    size: 7_900_000_000,
    sizeFormatted: "7.9 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 16_000_000_000,
    runtime: "ollama",
    ollamaTag: "kimi:k2.5-12b",
  },
  {
    id: "deepseek-r1-distill-14b",
    name: "DeepSeek R1 Distill 14B",
    description:
      "The logic powerhouse. Fine-tuned for mathematical certainty and zero-error reasoning trajectories.",
    size: 9_100_000_000,
    sizeFormatted: "9.1 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 18_000_000_000,
    runtime: "ollama",
    ollamaTag: "deepseek-r1:14b",
    contextWindow: 131072,
  },

  // ===== VISION MODELS =====
  {
    id: "smolvlm-500m",
    name: "SmolVLM 500M",
    description:
      "Ultra-fast vision model for background sensing and HDC semantic snapshots.",
    size: 500_000_000,
    sizeFormatted: "500 MB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 5,
    memoryRequirement: 2_000_000_000,
    runtime: "internal",
  },
  {
    id: "qwen2.5-vl-3b",
    name: "Qwen 2.5 VL 3B",
    description:
      "State-of-the-art vision reasoning for agentic UI automation and complex RAG expansion.",
    size: 3_200_000_000,
    sizeFormatted: "3.2 GB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 8_000_000_000,
    runtime: "internal",
  },
  {
    id: "moondream2",
    name: "Moondream2",
    description:
      "High-fidelity semantic visual describer. Excellent for deep memory expansion.",
    size: 1_600_000_000,
    sizeFormatted: "1.6 GB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 7,
    memoryRequirement: 4_000_000_000,
    runtime: "internal",
  },
  {
    id: "ui-tars-2b",
    name: "UI-TARS 2B",
    description:
      "Vision-language model specialized in intelligent UI navigation and clicking.",
    size: 2_000_000_000,
    sizeFormatted: "2.0 GB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 8_000_000_000,
    runtime: "internal",
  },

  // ===== TTS MODELS =====
  {
    id: "piper-amy",
    name: "Piper Amy",
    description: "Luca's low-latency offline voice synthesis core.",
    size: 60_000_000,
    sizeFormatted: "60 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 1,
    memoryRequirement: 256_000_000,
    runtime: "internal",
  },
  {
    id: "kokoro-82m",
    name: "Kokoro 82M",
    description:
      "Breakout 2026 model. Near-human local speech with ultra-lightweight footprint.",
    size: 82_000_000,
    sizeFormatted: "82 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 5,
    memoryRequirement: 300_000_000,
    runtime: "internal",
  },
  {
    id: "qwen3-tts",
    name: "Qwen 3 TTS 0.6B",
    description:
      "Alibaba's 2026 vocal powerhouse. Zero-shot voice cloning and streaming excellence.",
    size: 600_000_000,
    sizeFormatted: "600 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 9,
    memoryRequirement: 2_000_000_000,
    runtime: "internal",
  },
  {
    id: "supertonic-2",
    name: "Supertonic-2",
    description: "High-fidelity professional speech synthesis.",
    size: 200_000_000,
    sizeFormatted: "200 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 3,
    memoryRequirement: 512_000_000,
    runtime: "internal",
  },

  // ===== STT MODELS =====
  {
    id: "whisper-tiny",
    name: "Whisper Tiny",
    description: "Reliable offline speech recognition.",
    size: 190_000_000,
    sizeFormatted: "190 MB",
    category: "stt",
    platforms: ["desktop", "mobile"],
    performanceRank: 4,
    memoryRequirement: 512_000_000,
    runtime: "internal",
  },
  {
    id: "whisper-v3-turbo",
    name: "Whisper v3 Turbo",
    description: "Maximum accuracy pruned version.",
    size: 3_020_000_000,
    sizeFormatted: "3.0 GB",
    category: "stt",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 6_000_000_000,
    runtime: "internal",
  },

  // ===== EMBEDDING MODELS =====
  {
    id: "nomic-embed-text",
    name: "Nomic Embed Text",
    description: "Popular open-source embeddings.",
    size: 270_000_000,
    sizeFormatted: "270 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 2_000_000_000,
    runtime: "internal",
  },
  {
    id: "mxbai-embed-large",
    name: "MixedBread Large",
    description: "SOTA embeddings from mixedbread.ai.",
    size: 670_000_000,
    sizeFormatted: "670 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 4_000_000_000,
    runtime: "internal",
  },
  {
    id: "jina-embed-v2",
    name: "Jina Embed v2",
    description: "Supports huge 8k context window.",
    size: 540_000_000,
    sizeFormatted: "540 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 3_000_000_000,
    runtime: "internal",
  },
  {
    id: "bge-large-en",
    name: "BGE Large v1.5",
    description: "Industry-standard RAG embeddings.",
    size: 1_300_000_000,
    sizeFormatted: "1.3 GB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 6_000_000_000,
    runtime: "internal",
  },
];

export const LOCAL_BRAIN_MODEL_IDS = LOCAL_MODEL_DEFINITIONS.filter(
  (m) => m.category === "brain",
).map((m) => m.id);
export const LOCAL_VISION_MODEL_IDS = LOCAL_MODEL_DEFINITIONS.filter(
  (m) => m.category === "vision",
).map((m) => m.id);
export const LOCAL_TTS_MODEL_IDS = LOCAL_MODEL_DEFINITIONS.filter(
  (m) => m.category === "tts",
).map((m) => m.id);
export const LOCAL_STT_MODEL_IDS = LOCAL_MODEL_DEFINITIONS.filter(
  (m) => m.category === "stt",
).map((m) => m.id);
export const LOCAL_EMBEDDING_MODEL_IDS = LOCAL_MODEL_DEFINITIONS.filter(
  (m) => m.category === "embedding",
).map((m) => m.id);

export function isLocalModelId(modelId: string): boolean {
  return LOCAL_MODEL_DEFINITIONS.some((m) => m.id === modelId);
}

