export type LocalRuntimeKind =
  | "ollama"
  | "cortex"
  | "native-gguf"
  | "openai-compatible"
  | "webllm"
  | "mediapipe";

export type LocalModelFeature =
  | "chat"
  | "streaming"
  | "tools"
  | "vision"
  | "reasoning"
  | "embeddings";

export type LocalModelInstallStrategy =
  | "ollama-pull"
  | "cortex-download"
  | "webllm-cache"
  | "mediapipe-download"
  | "native-gguf-file"
  | "manual";

export interface LocalModelInstallPlan {
  strategy: LocalModelInstallStrategy;
  ref?: string;
}

export interface LocalModelArtifact {
  url?: string;
  sha256?: string;
  filename?: string;
  quantization?: string;
  architecture?: string;
  chatTemplate?: string;
  license?: string;
  provenance?: string;
  minimumRuntimeVersion?: string;
}

export interface LocalModelDescriptor {
  id: string;
  displayName: string;
  runtime: LocalRuntimeKind;
  runtimeModelId: string;
  sizeBytes?: number;
  minRamBytes?: number;
  contextWindow?: number;
  features: LocalModelFeature[];
  recommended?: boolean;
  install?: LocalModelInstallPlan;
  artifact?: LocalModelArtifact;
}

export interface LocalChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Base64 payloads or data URLs understood by multimodal runtime adapters. */
  images?: string[];
  toolCallId?: string;
}

export interface LocalToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: unknown;
  };
}

export interface LocalChatRequest {
  model: string;
  messages: LocalChatMessage[];
  tools?: LocalToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface LocalToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface LocalChatResponse {
  text: string;
  toolCalls?: LocalToolCall[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  runtime: LocalRuntimeKind;
  model: string;
}

export type LocalRuntimeEvent =
  | { type: "token"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool_call"; toolCall: LocalToolCall }
  | { type: "stats"; inputTokens?: number; outputTokens?: number }
  | { type: "error"; error: string }
  | { type: "done" };
