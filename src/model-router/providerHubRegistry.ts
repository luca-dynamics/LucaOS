import type {
  LucaModelCapability,
  LucaModelCostTier,
  LucaModelFit,
  LucaModelProviderType,
  LucaModelTaskType,
} from "./modelRouterContract";

export type LucaProviderHubId =
  | "luca_prime"
  | "openai"
  | "anthropic"
  | "google_gemini"
  | "xai_grok"
  | "openrouter"
  | "mistral"
  | "deepseek"
  | "groq"
  | "together"
  | "fireworks"
  | "perplexity"
  | "ollama"
  | "lm_studio"
  | "custom_openai_compatible"
  | "local_runtime"
  | "disabled"
  | "unknown";

export type LucaProviderHubCategory =
  | "luca_managed"
  | "connected_cloud"
  | "router"
  | "local_runtime"
  | "custom"
  | "disabled";

export interface LucaProviderHubEntry {
  readonly providerId: LucaProviderHubId;
  readonly providerType: LucaModelProviderType;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly category: LucaProviderHubCategory;
  readonly requiresUserKey: boolean;
  readonly supportsOAuthLikeConnection: boolean;
  readonly supportsApiKeyConnection: boolean;
  readonly supportsCustomBaseUrl: boolean;
  readonly defaultBaseUrl?: string;
  readonly websiteUrl?: string;
  readonly documentationUrl?: string;
  readonly supportedTaskTypes: readonly LucaModelTaskType[];
  readonly capabilities: readonly LucaModelCapability[];
  readonly defaultCostTier: LucaModelCostTier;
  readonly defaultLatencyFit: LucaModelFit;
  readonly privacyFit: LucaModelFit;
  readonly notes: readonly string[];
  readonly modelAliases: readonly string[];
}

export interface LucaProviderHubRegistrySummary {
  readonly totalProviders: number;
  readonly categories: Readonly<Record<LucaProviderHubCategory, number>>;
  readonly providersRequiringUserKey: number;
  readonly providersSupportingCustomBaseUrl: number;
  readonly providersSupportingApiKeyConnection: number;
  readonly providersSupportingOAuthLikeConnection: number;
}

const CHAT_TASKS = ["chat", "code", "tool_planning", "long_context", "fast_reply"] as const satisfies readonly LucaModelTaskType[];
const TEXT_CAPABILITIES = ["text_generation", "streaming", "tool_calling", "code_generation", "long_context"] as const satisfies readonly LucaModelCapability[];
const FULL_CLOUD_TASKS = ["chat", "vision", "memory", "embedding", "code", "tool_planning", "long_context", "fast_reply"] as const satisfies readonly LucaModelTaskType[];
const FULL_CLOUD_CAPABILITIES = ["text_generation", "streaming", "vision", "embedding", "tool_calling", "code_generation", "long_context"] as const satisfies readonly LucaModelCapability[];

const PROVIDER_HUB_ENTRIES: readonly LucaProviderHubEntry[] = [
  {
    providerId: "luca_prime",
    providerType: "luca_cloud",
    label: "Luca Prime",
    shortLabel: "Prime",
    description: "LucaOS-managed premium model access for default cloud intelligence.",
    category: "luca_managed",
    requiresUserKey: false,
    supportsOAuthLikeConnection: false,
    supportsApiKeyConnection: false,
    supportsCustomBaseUrl: false,
    supportedTaskTypes: ["chat", "voice_stt", "voice_tts", "vision", "memory", "embedding", "code", "tool_planning", "long_context", "fast_reply"],
    capabilities: ["text_generation", "streaming", "vision", "speech_to_text", "text_to_speech", "embedding", "tool_calling", "code_generation", "long_context"],
    defaultCostTier: "medium",
    defaultLatencyFit: "pass",
    privacyFit: "warning",
    notes: ["Managed default; exact backing models remain an implementation detail."],
    modelAliases: ["luca", "luca-prime", "luca_prime", "prime"],
  },
  {
    providerId: "openai", providerType: "openai", label: "OpenAI / ChatGPT compatible", shortLabel: "OpenAI", description: "OpenAI API provider for GPT-family models.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.openai.com/v1", websiteUrl: "https://openai.com", documentationUrl: "https://platform.openai.com/docs", supportedTaskTypes: FULL_CLOUD_TASKS, capabilities: FULL_CLOUD_CAPABILITIES, defaultCostTier: "medium", defaultLatencyFit: "pass", privacyFit: "warning", notes: ["User-managed key or subscription is required outside Luca Prime."], modelAliases: ["openai", "chatgpt", "gpt", "gpt-4", "gpt-5"]
  },
  { providerId: "anthropic", providerType: "anthropic", label: "Anthropic Claude", shortLabel: "Claude", description: "Anthropic API provider for Claude-family models.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.anthropic.com", websiteUrl: "https://anthropic.com", documentationUrl: "https://docs.anthropic.com", supportedTaskTypes: CHAT_TASKS, capabilities: TEXT_CAPABILITIES, defaultCostTier: "medium", defaultLatencyFit: "pass", privacyFit: "warning", notes: ["Vision support depends on selected Claude model and future runtime wiring."], modelAliases: ["anthropic", "claude", "claude-opus", "claude-sonnet", "claude-haiku"] },
  { providerId: "google_gemini", providerType: "google", label: "Google Gemini", shortLabel: "Gemini", description: "Google Gemini API provider for multimodal Gemini-family models.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://generativelanguage.googleapis.com", websiteUrl: "https://ai.google.dev", documentationUrl: "https://ai.google.dev/gemini-api/docs", supportedTaskTypes: FULL_CLOUD_TASKS, capabilities: FULL_CLOUD_CAPABILITIES, defaultCostTier: "low", defaultLatencyFit: "pass", privacyFit: "warning", notes: ["Also used by existing LucaOS managed-key paths; this registry does not change that behavior."], modelAliases: ["google", "gemini", "google-gemini"] },
  { providerId: "xai_grok", providerType: "xai", label: "xAI Grok", shortLabel: "Grok", description: "xAI API provider for Grok-family models.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.x.ai/v1", websiteUrl: "https://x.ai", documentationUrl: "https://docs.x.ai", supportedTaskTypes: CHAT_TASKS, capabilities: TEXT_CAPABILITIES, defaultCostTier: "medium", defaultLatencyFit: "pass", privacyFit: "warning", notes: [], modelAliases: ["xai", "x.ai", "grok", "xai-grok"] },
  { providerId: "openrouter", providerType: "openrouter", label: "OpenRouter", shortLabel: "OpenRouter", description: "Model router for accessing many third-party models through one compatible endpoint.", category: "router", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://openrouter.ai/api/v1", websiteUrl: "https://openrouter.ai", documentationUrl: "https://openrouter.ai/docs", supportedTaskTypes: FULL_CLOUD_TASKS, capabilities: FULL_CLOUD_CAPABILITIES, defaultCostTier: "medium", defaultLatencyFit: "warning", privacyFit: "warning", notes: ["Downstream model behavior depends on the selected routed model."], modelAliases: ["openrouter", "open-router"] },
  { providerId: "mistral", providerType: "mistral", label: "Mistral AI", shortLabel: "Mistral", description: "Mistral API provider for Mistral and Codestral families.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.mistral.ai/v1", websiteUrl: "https://mistral.ai", documentationUrl: "https://docs.mistral.ai", supportedTaskTypes: ["chat", "embedding", "code", "tool_planning", "long_context", "fast_reply"], capabilities: ["text_generation", "streaming", "embedding", "tool_calling", "code_generation", "long_context"], defaultCostTier: "medium", defaultLatencyFit: "pass", privacyFit: "warning", notes: [], modelAliases: ["mistral", "codestral", "mixtral"] },
  { providerId: "deepseek", providerType: "deepseek", label: "DeepSeek", shortLabel: "DeepSeek", description: "DeepSeek API provider for chat, reasoning, and coding models.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.deepseek.com", websiteUrl: "https://deepseek.com", documentationUrl: "https://api-docs.deepseek.com", supportedTaskTypes: CHAT_TASKS, capabilities: TEXT_CAPABILITIES, defaultCostTier: "low", defaultLatencyFit: "pass", privacyFit: "warning", notes: [], modelAliases: ["deepseek", "deepseek-chat", "deepseek-coder"] },
  { providerId: "groq", providerType: "groq", label: "Groq", shortLabel: "Groq", description: "GroqCloud provider focused on low-latency inference for supported open models.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.groq.com/openai/v1", websiteUrl: "https://groq.com", documentationUrl: "https://console.groq.com/docs", supportedTaskTypes: ["chat", "voice_stt", "code", "tool_planning", "fast_reply"], capabilities: ["text_generation", "streaming", "speech_to_text", "tool_calling", "code_generation"], defaultCostTier: "low", defaultLatencyFit: "pass", privacyFit: "warning", notes: ["Model availability is catalog-dependent."], modelAliases: ["groq", "llama3", "whisper-large-v3"] },
  { providerId: "together", providerType: "together", label: "Together AI", shortLabel: "Together", description: "Together AI provider for hosted open and multimodal models.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.together.xyz/v1", websiteUrl: "https://together.ai", documentationUrl: "https://docs.together.ai", supportedTaskTypes: FULL_CLOUD_TASKS, capabilities: FULL_CLOUD_CAPABILITIES, defaultCostTier: "low", defaultLatencyFit: "pass", privacyFit: "warning", notes: [], modelAliases: ["together", "together-ai"] },
  { providerId: "fireworks", providerType: "fireworks", label: "Fireworks AI", shortLabel: "Fireworks", description: "Fireworks provider for serverless open-model inference.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.fireworks.ai/inference/v1", websiteUrl: "https://fireworks.ai", documentationUrl: "https://docs.fireworks.ai", supportedTaskTypes: FULL_CLOUD_TASKS, capabilities: FULL_CLOUD_CAPABILITIES, defaultCostTier: "low", defaultLatencyFit: "pass", privacyFit: "warning", notes: [], modelAliases: ["fireworks", "fireworks-ai"] },
  { providerId: "perplexity", providerType: "perplexity", label: "Perplexity", shortLabel: "Perplexity", description: "Perplexity provider for answer and search-grounded model families.", category: "connected_cloud", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: false, defaultBaseUrl: "https://api.perplexity.ai", websiteUrl: "https://perplexity.ai", documentationUrl: "https://docs.perplexity.ai", supportedTaskTypes: ["chat", "long_context", "fast_reply"], capabilities: ["text_generation", "streaming", "long_context"], defaultCostTier: "medium", defaultLatencyFit: "pass", privacyFit: "warning", notes: ["Search grounding is a provider feature, not an MCP/tool replacement."], modelAliases: ["perplexity", "sonar", "pplx"] },
  { providerId: "ollama", providerType: "ollama", label: "Ollama", shortLabel: "Ollama", description: "Local Ollama runtime for downloaded models.", category: "local_runtime", requiresUserKey: false, supportsOAuthLikeConnection: false, supportsApiKeyConnection: false, supportsCustomBaseUrl: true, defaultBaseUrl: "http://localhost:11434", websiteUrl: "https://ollama.com", documentationUrl: "https://github.com/ollama/ollama/tree/main/docs", supportedTaskTypes: ["chat", "vision", "memory", "embedding", "code", "tool_planning", "fast_reply", "private_local"], capabilities: ["text_generation", "streaming", "vision", "embedding", "tool_calling", "code_generation", "local_only"], defaultCostTier: "free", defaultLatencyFit: "warning", privacyFit: "pass", notes: ["Requires a local runtime and local model availability; this registry does not start Ollama."], modelAliases: ["ollama", "llama", "mistral-local"] },
  { providerId: "lm_studio", providerType: "local_runtime", label: "LM Studio", shortLabel: "LM Studio", description: "Local LM Studio OpenAI-compatible server runtime.", category: "local_runtime", requiresUserKey: false, supportsOAuthLikeConnection: false, supportsApiKeyConnection: false, supportsCustomBaseUrl: true, defaultBaseUrl: "http://localhost:1234/v1", websiteUrl: "https://lmstudio.ai", documentationUrl: "https://lmstudio.ai/docs", supportedTaskTypes: ["chat", "embedding", "code", "tool_planning", "fast_reply", "private_local"], capabilities: ["text_generation", "streaming", "embedding", "tool_calling", "code_generation", "local_only"], defaultCostTier: "free", defaultLatencyFit: "warning", privacyFit: "pass", notes: ["Requires the user to run a local LM Studio server."], modelAliases: ["lmstudio", "lm-studio", "lm_studio"] },
  { providerId: "custom_openai_compatible", providerType: "byok", label: "Custom OpenAI-compatible", shortLabel: "Custom", description: "Advanced BYOK endpoint for OpenAI-compatible provider APIs.", category: "custom", requiresUserKey: true, supportsOAuthLikeConnection: false, supportsApiKeyConnection: true, supportsCustomBaseUrl: true, supportedTaskTypes: FULL_CLOUD_TASKS, capabilities: FULL_CLOUD_CAPABILITIES, defaultCostTier: "unknown", defaultLatencyFit: "unknown", privacyFit: "unknown", notes: ["Capabilities depend on the endpoint and selected model."], modelAliases: ["custom", "openai-compatible", "custom-openai", "byok"] },
  { providerId: "local_runtime", providerType: "local_runtime", label: "Internal local runtime", shortLabel: "Local", description: "LucaOS internal local model runtime abstraction.", category: "local_runtime", requiresUserKey: false, supportsOAuthLikeConnection: false, supportsApiKeyConnection: false, supportsCustomBaseUrl: false, supportedTaskTypes: ["chat", "voice_stt", "voice_tts", "vision", "memory", "embedding", "code", "tool_planning", "fast_reply", "private_local"], capabilities: ["text_generation", "streaming", "vision", "speech_to_text", "text_to_speech", "embedding", "tool_calling", "code_generation", "local_only"], defaultCostTier: "free", defaultLatencyFit: "warning", privacyFit: "pass", notes: ["Represents internal local execution metadata only; it does not execute models."], modelAliases: ["local", "local-runtime", "internal-local"] },
  { providerId: "disabled", providerType: "disabled", label: "Disabled", shortLabel: "Disabled", description: "Explicitly disabled provider selection.", category: "disabled", requiresUserKey: false, supportsOAuthLikeConnection: false, supportsApiKeyConnection: false, supportsCustomBaseUrl: false, supportedTaskTypes: [], capabilities: [], defaultCostTier: "unknown", defaultLatencyFit: "fail", privacyFit: "unknown", notes: ["Safe fallback for intentionally unavailable provider slots."], modelAliases: ["disabled", "none", "off"] },
  { providerId: "unknown", providerType: "unknown", label: "Unknown provider", shortLabel: "Unknown", description: "Safe representation for an unrecognized provider string.", category: "disabled", requiresUserKey: false, supportsOAuthLikeConnection: false, supportsApiKeyConnection: false, supportsCustomBaseUrl: false, supportedTaskTypes: [], capabilities: [], defaultCostTier: "unknown", defaultLatencyFit: "unknown", privacyFit: "unknown", notes: ["Use for display and diagnostics only; never implies a fallback execution provider."], modelAliases: ["unknown"] },
];

const PROVIDER_BY_ID = new Map<LucaProviderHubId, LucaProviderHubEntry>(PROVIDER_HUB_ENTRIES.map((entry) => [entry.providerId, entry]));
const PROVIDER_ALIAS_TO_ID = new Map<string, LucaProviderHubId>(PROVIDER_HUB_ENTRIES.flatMap((entry) => [entry.providerId, ...entry.modelAliases].map((alias) => [normalizeAlias(alias), entry.providerId] as const)));

function normalizeAlias(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function getProviderHubEntries(): readonly LucaProviderHubEntry[] {
  return PROVIDER_HUB_ENTRIES;
}

export function getProviderHubEntry(providerId: LucaProviderHubId): LucaProviderHubEntry {
  return PROVIDER_BY_ID.get(providerId) ?? PROVIDER_BY_ID.get("unknown")!;
}

export function getProviderHubEntriesByCategory(category: LucaProviderHubCategory): readonly LucaProviderHubEntry[] {
  return PROVIDER_HUB_ENTRIES.filter((entry) => entry.category === category);
}

export function getProviderHubEntriesForTask(taskType: LucaModelTaskType): readonly LucaProviderHubEntry[] {
  return PROVIDER_HUB_ENTRIES.filter((entry) => entry.supportedTaskTypes.includes(taskType));
}

export function getProviderHubEntriesRequiringUserKey(): readonly LucaProviderHubEntry[] {
  return PROVIDER_HUB_ENTRIES.filter((entry) => entry.requiresUserKey);
}

export function normalizeProviderHubId(input: string): LucaProviderHubId {
  return PROVIDER_ALIAS_TO_ID.get(normalizeAlias(input)) ?? "unknown";
}

export function providerSupportsTask(providerId: LucaProviderHubId, taskType: LucaModelTaskType): boolean {
  return getProviderHubEntry(providerId).supportedTaskTypes.includes(taskType);
}

export function providerHasCapability(providerId: LucaProviderHubId, capability: LucaModelCapability): boolean {
  return getProviderHubEntry(providerId).capabilities.includes(capability);
}

export function summarizeProviderHubRegistry(): LucaProviderHubRegistrySummary {
  const categories: Record<LucaProviderHubCategory, number> = {
    luca_managed: 0,
    connected_cloud: 0,
    router: 0,
    local_runtime: 0,
    custom: 0,
    disabled: 0,
  };

  for (const entry of PROVIDER_HUB_ENTRIES) {
    categories[entry.category] += 1;
  }

  return {
    totalProviders: PROVIDER_HUB_ENTRIES.length,
    categories,
    providersRequiringUserKey: getProviderHubEntriesRequiringUserKey().length,
    providersSupportingCustomBaseUrl: PROVIDER_HUB_ENTRIES.filter((entry) => entry.supportsCustomBaseUrl).length,
    providersSupportingApiKeyConnection: PROVIDER_HUB_ENTRIES.filter((entry) => entry.supportsApiKeyConnection).length,
    providersSupportingOAuthLikeConnection: PROVIDER_HUB_ENTRIES.filter((entry) => entry.supportsOAuthLikeConnection).length,
  };
}
