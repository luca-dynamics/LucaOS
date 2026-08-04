export enum ModelCapability {
  Streaming = "streaming",
  ToolCalling = "tool_calling",
  Vision = "vision",
  AudioInput = "audio_input",
  AudioOutput = "audio_output",
  FastLatency = "fast_latency",
  Reasoning = "reasoning",
}

export interface ProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  audioInput: boolean;
  audioOutput: boolean;
  jsonMode: boolean;
  reasoning: boolean;
  maxContextTokens: number;
  supportsCancellation: boolean;
}

export interface ModelInvokeOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
}

export type ProviderHealth = "healthy" | "degraded" | "unavailable";

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
}

export interface ModelProvider {
  id: string;
  name: string;
  capabilities: ModelCapability[];
  detailedCapabilities: ProviderCapabilities;
  contextWindowTokens: number;

  invoke(options: ModelInvokeOptions): Promise<string>;
  stream(
    options: ModelInvokeOptions,
    onToken: (token: string) => void
  ): Promise<string>;

  getHealth(): ProviderHealth;
  getMetrics(): ProviderMetrics;
}
