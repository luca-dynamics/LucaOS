import type { LucaModelCapability, LucaModelTaskType } from "./modelRouterContract";
import type { LucaProviderHubRoutePreference, LucaProviderHubRouteRequest } from "./providerHubRoutePlanner";
import type { LucaProviderHubConnectionTestResult } from "./providerHubConnectionTest";
import type { LucaProviderHubConnectionSnapshot } from "./providerHubReadiness";
import type { LucaProviderHubId } from "./providerHubRegistry";

export type LucaProviderHubTaskRoutePolicyId = LucaModelTaskType;

export interface LucaProviderHubTaskRoutePolicy {
  readonly id: LucaProviderHubTaskRoutePolicyId;
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly preferredCapabilities?: readonly LucaModelCapability[];
  readonly defaultPreference: LucaProviderHubRoutePreference;
  readonly allowFallbacks: boolean;
  readonly allowPaidProviders: boolean;
  readonly allowLocalProviders: boolean;
  readonly allowCloudProviders: boolean;
  readonly preferLocalWhenPrivate: boolean;
  readonly requiresExplicitUserKey?: boolean;
  readonly safetyNotes: readonly string[];
  readonly sideEffectsPerformed: false;
}

export interface LucaProviderHubTaskRoutePolicyInput {
  readonly taskType: LucaModelTaskType;
  readonly isPrivateContext?: boolean;
  readonly preferenceOverride?: LucaProviderHubRoutePreference;
  readonly allowFallbacksOverride?: boolean;
  readonly allowPaidProvidersOverride?: boolean;
  readonly allowLocalProvidersOverride?: boolean;
  readonly allowCloudProvidersOverride?: boolean;
}

export interface LucaProviderHubTaskRoutePolicyResolution {
  readonly policy: LucaProviderHubTaskRoutePolicy;
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly preferredCapabilities: readonly LucaModelCapability[];
  readonly preference: LucaProviderHubRoutePreference;
  readonly allowFallbacks: boolean;
  readonly allowPaidProviders: boolean;
  readonly allowLocalProviders: boolean;
  readonly allowCloudProviders: boolean;
  readonly safetyNotes: readonly string[];
  readonly sideEffectsPerformed: false;
}

const POLICIES: Readonly<Record<LucaProviderHubTaskRoutePolicyId, LucaProviderHubTaskRoutePolicy>> = {
  chat: { id: "chat", taskType: "chat", requiredCapabilities: ["text_generation"], preferredCapabilities: ["streaming"], defaultPreference: "balanced", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["Default chat routing policy only; ProviderFactory guard still controls execution."], sideEffectsPerformed: false },
  fast_reply: { id: "fast_reply", taskType: "fast_reply", requiredCapabilities: ["text_generation"], preferredCapabilities: ["streaming"], defaultPreference: "lowest_latency", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: false, safetyNotes: ["Optimizes preview selection for low latency without calling providers."], sideEffectsPerformed: false },
  long_context: { id: "long_context", taskType: "long_context", requiredCapabilities: ["long_context"], preferredCapabilities: ["text_generation"], defaultPreference: "managed_first", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: false, safetyNotes: ["Long-context policy is declarative only; no new runtime surface is enabled."], sideEffectsPerformed: false },
  code: { id: "code", taskType: "code", requiredCapabilities: ["code_generation"], preferredCapabilities: ["long_context", "tool_calling"], defaultPreference: "managed_first", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["Code policy does not route code execution or tools through Provider Hub."], sideEffectsPerformed: false },
  tool_planning: { id: "tool_planning", taskType: "tool_planning", requiredCapabilities: ["tool_calling"], preferredCapabilities: ["text_generation"], defaultPreference: "managed_first", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["MCP/action execution remains separate from Provider Hub and is not implied by this policy."], sideEffectsPerformed: false },
  private_local: { id: "private_local", taskType: "private_local", requiredCapabilities: ["text_generation", "local_only"], defaultPreference: "local_first", allowFallbacks: true, allowPaidProviders: false, allowLocalProviders: true, allowCloudProviders: false, preferLocalWhenPrivate: true, safetyNotes: ["Fallbacks must not cross to cloud providers for private-local routing."], sideEffectsPerformed: false },
  vision: { id: "vision", taskType: "vision", requiredCapabilities: ["vision"], preferredCapabilities: ["text_generation"], defaultPreference: "managed_first", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["Vision policy exists for preview/diagnostics only; no vision execution wiring is added."], sideEffectsPerformed: false },
  memory: { id: "memory", taskType: "memory", requiredCapabilities: ["embedding"], defaultPreference: "local_first", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["Memory policy is limited to routing policy metadata and does not wire memory execution."], sideEffectsPerformed: false },
  embedding: { id: "embedding", taskType: "embedding", requiredCapabilities: ["embedding"], defaultPreference: "local_first", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["Embedding policy prefers local where available without starting local runtimes."], sideEffectsPerformed: false },
  voice_stt: { id: "voice_stt", taskType: "voice_stt", requiredCapabilities: ["speech_to_text"], defaultPreference: "lowest_latency", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["Voice STT policy exists but does not wire Provider Hub voice execution."], sideEffectsPerformed: false },
  voice_tts: { id: "voice_tts", taskType: "voice_tts", requiredCapabilities: ["text_to_speech"], defaultPreference: "lowest_latency", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true, preferLocalWhenPrivate: true, safetyNotes: ["Voice TTS policy exists but does not wire Provider Hub voice execution."], sideEffectsPerformed: false },
};

export function getProviderHubTaskRoutePolicy(taskType: LucaModelTaskType): LucaProviderHubTaskRoutePolicy { return POLICIES[taskType]; }

export function resolveProviderHubTaskRoutePolicy(input: LucaProviderHubTaskRoutePolicyInput): LucaProviderHubTaskRoutePolicyResolution {
  const policy = getProviderHubTaskRoutePolicy(input.taskType);
  const preferLocal = Boolean(input.isPrivateContext && policy.preferLocalWhenPrivate);
  const allowCloudProviders = policy.taskType === "private_local" ? false : input.allowCloudProvidersOverride ?? policy.allowCloudProviders;
  return {
    policy,
    taskType: policy.taskType,
    requiredCapabilities: [...policy.requiredCapabilities],
    preferredCapabilities: [...(policy.preferredCapabilities ?? [])],
    preference: input.preferenceOverride ?? (preferLocal ? "local_first" : policy.defaultPreference),
    allowFallbacks: input.allowFallbacksOverride ?? policy.allowFallbacks,
    allowPaidProviders: input.allowPaidProvidersOverride ?? policy.allowPaidProviders,
    allowLocalProviders: input.allowLocalProvidersOverride ?? policy.allowLocalProviders,
    allowCloudProviders,
    safetyNotes: [...policy.safetyNotes],
    sideEffectsPerformed: false,
  };
}

export function createProviderHubRouteRequestFromPolicy(policy: LucaProviderHubTaskRoutePolicyResolution | LucaProviderHubTaskRoutePolicy, overrides: Partial<Omit<LucaProviderHubRouteRequest, "taskType" | "requiredCapabilities" | "preference" | "allowFallbacks" | "allowPaidProviders" | "allowLocalProviders" | "allowCloudProviders">> & { readonly connectionSnapshots?: readonly LucaProviderHubConnectionSnapshot[]; readonly connectionTestResults?: readonly LucaProviderHubConnectionTestResult[]; readonly preferredProviderId?: LucaProviderHubId; readonly preference?: LucaProviderHubRoutePreference; readonly allowFallbacks?: boolean; readonly allowPaidProviders?: boolean; readonly allowLocalProviders?: boolean; readonly allowCloudProviders?: boolean } = {}): LucaProviderHubRouteRequest {
  const resolved = "policy" in policy ? policy : resolveProviderHubTaskRoutePolicy({ taskType: policy.taskType });
  return { taskType: resolved.taskType, requiredCapabilities: resolved.requiredCapabilities, preference: overrides.preference ?? resolved.preference, connectionSnapshots: overrides.connectionSnapshots ?? [], connectionTestResults: overrides.connectionTestResults, preferredProviderId: overrides.preferredProviderId, allowFallbacks: overrides.allowFallbacks ?? resolved.allowFallbacks, allowPaidProviders: overrides.allowPaidProviders ?? resolved.allowPaidProviders, allowLocalProviders: overrides.allowLocalProviders ?? resolved.allowLocalProviders, allowCloudProviders: resolved.taskType === "private_local" ? false : overrides.allowCloudProviders ?? resolved.allowCloudProviders };
}

export function createProviderHubTaskRoutePolicyDiagnostics(policy: LucaProviderHubTaskRoutePolicyResolution | LucaProviderHubTaskRoutePolicy): string {
  const resolved = "policy" in policy ? policy : resolveProviderHubTaskRoutePolicy({ taskType: policy.taskType });
  return JSON.stringify({ taskType: resolved.taskType, requiredCapabilities: resolved.requiredCapabilities, preferredCapabilities: resolved.preferredCapabilities, preference: resolved.preference, allowFallbacks: resolved.allowFallbacks, allowPaidProviders: resolved.allowPaidProviders, allowLocalProviders: resolved.allowLocalProviders, allowCloudProviders: resolved.allowCloudProviders, safetyNotes: resolved.safetyNotes, canExecute: false, sideEffectsPerformed: false, providerApiCalled: false, automaticConnectionTest: false, localRuntimeStartup: false });
}
