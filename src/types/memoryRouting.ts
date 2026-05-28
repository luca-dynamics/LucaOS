import type { ModelFallbackPolicy } from "./modelRouting";

export type MemoryMode = "local" | "luca-prime" | "byok" | "disabled" | "degraded";

export type MemoryCapability =
  | "store"
  | "retrieve"
  | "embed"
  | "summarize"
  | "hydrate_context";

export type MemoryReadinessState =
  | "ready"
  | "missing_embedding_model"
  | "missing_runtime"
  | "missing_vector_store"
  | "missing_key"
  | "disabled"
  | "degraded"
  | "unknown"
  | "error";

export type MemoryPrivacyPosture =
  | "local_only"
  | "cloud_managed"
  | "user_key_cloud"
  | "mixed";

export interface MemoryCapabilityStatus {
  capability: MemoryCapability;
  readiness: MemoryReadinessState;
  reason: string;
  warnings: string[];
  canRun: boolean;
}

export interface MemoryRouteDecision {
  mode: MemoryMode;
  provider: string;
  embeddingModel: string;
  vectorStore: string;
  readiness: MemoryReadinessState;
  reason: string;
  warnings: string[];
  networkAllowed: boolean;
  fallbackPolicy: ModelFallbackPolicy;
  privacy: MemoryPrivacyPosture;
  capabilities: Record<MemoryCapability, MemoryCapabilityStatus>;
  embeddingRouteReadiness?: string;
  localEmbeddingModelInstalled?: boolean;
  localRuntimeAvailable?: boolean;
}

export const MEMORY_CAPABILITIES: MemoryCapability[] = [
  "store",
  "retrieve",
  "embed",
  "summarize",
  "hydrate_context",
];
