import type {
  LocalModelDescriptor,
  LocalModelFeature,
  LocalRuntimeKind,
} from "./LocalModelTypes";

export const LOCAL_MODEL_CATALOG: LocalModelDescriptor[] = [
  {
    id: "ollama:llama3.2:3b",
    displayName: "Llama 3.2 3B",
    runtime: "ollama",
    runtimeModelId: "llama3.2:3b",
    contextWindow: 8192,
    features: ["chat", "streaming", "tools"],
    recommended: true,
    install: { strategy: "ollama-pull", ref: "llama3.2:3b" },
  },
  {
    id: "ollama:qwen2.5:7b",
    displayName: "Qwen 2.5 7B",
    runtime: "ollama",
    runtimeModelId: "qwen2.5:7b",
    contextWindow: 32768,
    features: ["chat", "streaming", "tools"],
    install: { strategy: "ollama-pull", ref: "qwen2.5:7b" },
  },
  {
    id: "ollama:gemma3:4b",
    displayName: "Gemma 3 4B",
    runtime: "ollama",
    runtimeModelId: "gemma3:4b",
    contextWindow: 8192,
    features: ["chat", "streaming", "tools", "vision"],
    install: { strategy: "ollama-pull", ref: "gemma3:4b" },
  },
  {
    id: "cortex:gemma-2b",
    displayName: "Gemma 2B GGUF",
    runtime: "cortex",
    runtimeModelId: "gemma-2b",
    sizeBytes: 1_700_000_000,
    contextWindow: 8192,
    features: ["chat"],
    install: { strategy: "cortex-download", ref: "gemma-2b" },
  },
  {
    id: "cortex:llama-3.2-1b",
    displayName: "Llama 3.2 1B GGUF",
    runtime: "cortex",
    runtimeModelId: "llama-3.2-1b",
    sizeBytes: 1_100_000_000,
    contextWindow: 8192,
    features: ["chat"],
    install: { strategy: "cortex-download", ref: "llama-3.2-1b" },
  },
  {
    id: "mediapipe:gemma-2b-it",
    displayName: "Gemma 2B MediaPipe",
    runtime: "mediapipe",
    runtimeModelId: "gemma-2b-it",
    sizeBytes: 1_400_000_000,
    features: ["chat"],
    recommended: true,
    install: { strategy: "mediapipe-download", ref: "gemma-2b-it" },
  },
  {
    id: "webllm:Phi-3-mini-4k-instruct-q4f16_1-MLC",
    displayName: "Phi-3 Mini WebLLM",
    runtime: "webllm",
    runtimeModelId: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
    sizeBytes: 2_300_000_000,
    features: ["chat"],
    install: { strategy: "webllm-cache" },
  },
  {
    id: "webllm:Llama-3.2-1B-Instruct-q4f16_1-MLC",
    displayName: "Llama 3.2 1B WebLLM",
    runtime: "webllm",
    runtimeModelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    sizeBytes: 1_000_000_000,
    features: ["chat"],
    install: { strategy: "webllm-cache" },
  },
  {
    id: "webllm:SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    displayName: "SmolLM2 1.7B WebLLM",
    runtime: "webllm",
    runtimeModelId: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    sizeBytes: 1_200_000_000,
    features: ["chat"],
    install: { strategy: "webllm-cache" },
  },
];

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
