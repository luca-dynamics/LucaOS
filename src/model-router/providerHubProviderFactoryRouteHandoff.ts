import type { LucaSettings } from "../services/settingsService";
import type { CloudProviderId, ModelProvisioningRoute } from "../services/llm/ProviderFactory";
import type { LucaModelCapability, LucaModelTaskType } from "./modelRouterContract";
import type { LucaProviderHubRouteDecisionStatus } from "./providerHubRoutePlanner";
import type { LucaProviderHubId } from "./providerHubRegistry";

export type LucaProviderHubFinalRouteFallbackReason =
  | "flag_disabled"
  | "provider_hub_not_selected"
  | "handoff_not_mapped"
  | "blocked_decision"
  | "missing_configuration"
  | "unsupported_provider"
  | "no_handoff_result"
  | "safety_guard"
  | "unknown";

export type LucaProviderHubRouteHandoffStatus =
  | "disabled"
  | "mapped"
  | "fallback_current_route"
  | "unsupported_provider"
  | "missing_configuration"
  | "blocked_decision";

export interface LucaProviderHubRouteHandoffInput {
  readonly runtimeRouteSelectionEnabled: boolean;
  readonly providerHubSelectedProviderId?: LucaProviderHubId;
  readonly providerHubSelectedModelId?: string;
  readonly decisionStatus: LucaProviderHubRouteDecisionStatus | "disabled";
  readonly shouldUseProviderHubRoute: boolean;
  readonly currentRoute: ModelProvisioningRoute;
  readonly settings: LucaSettings["brain"];
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
}

export interface LucaProviderHubRouteHandoffResult {
  readonly shouldUseProviderHubRoute: boolean;
  readonly handoffRoute: ModelProvisioningRoute;
  readonly fallbackRoute: ModelProvisioningRoute;
  readonly selectedProviderId?: LucaProviderHubId;
  readonly selectedModelId?: string;
  readonly handoffStatus: LucaProviderHubRouteHandoffStatus;
  readonly reason: string;
  readonly fallbackReasonCode?: LucaProviderHubFinalRouteFallbackReason;
  readonly fallbackReason?: string;
  readonly routeSource: "current_provider_factory" | "provider_hub_handoff";
  readonly flagDisabledRestoresCurrentRoute: boolean;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly providerApiCalled: false;
  readonly providerAdapterInstantiated: false;
  readonly runtimeExecutionChanged: false;
}

const MAPPED_BYOK_PROVIDERS: Readonly<Record<string, CloudProviderId>> = {
  openai: "openai",
  anthropic: "anthropic",
  google_gemini: "gemini",
  xai_grok: "xai",
  deepseek: "deepseek",
  groq: "groq",
};

const API_KEY_BY_PROVIDER: Readonly<Record<string, keyof LucaSettings["brain"]>> = {
  openai: "openaiApiKey",
  anthropic: "anthropicApiKey",
  google_gemini: "geminiApiKey",
  xai_grok: "xaiApiKey",
  deepseek: "deepseekApiKey",
  groq: "groqApiKey",
};

const USABLE_DECISIONS = new Set<LucaProviderHubRouteHandoffInput["decisionStatus"]>(["selected", "fallback_selected"]);

function hasConfiguredString(settings: LucaSettings["brain"], key: keyof LucaSettings["brain"]): boolean {
  const value = settings[key];
  return typeof value === "string" && value.trim().length > 0 && value !== "[SECURED]";
}

function modelFor(input: LucaProviderHubRouteHandoffInput): string {
  return input.providerHubSelectedModelId?.trim() || input.currentRoute.model;
}

function diagnostics(result: Omit<LucaProviderHubRouteHandoffResult, "safeDiagnosticsText">, input: LucaProviderHubRouteHandoffInput): string {
  return JSON.stringify({
    runtimeRouteSelectionEnabled: input.runtimeRouteSelectionEnabled,
    decisionStatus: input.decisionStatus,
    selectedProviderId: result.selectedProviderId ?? null,
    selectedModelId: result.selectedModelId ?? null,
    handoffStatus: result.handoffStatus,
    fallbackReasonCode: result.fallbackReasonCode ?? null,
    fallbackReason: result.fallbackReason ?? null,
    routeSource: result.routeSource,
    flagDisabledRestoresCurrentRoute: result.flagDisabledRestoresCurrentRoute,
    shouldUseProviderHubRoute: result.shouldUseProviderHubRoute,
    fallbackRouteKind: result.fallbackRoute.kind,
    handoffRouteKind: result.handoffRoute.kind,
    actualProviderFactoryRoute: result.shouldUseProviderHubRoute ? result.handoffRoute.kind : result.fallbackRoute.kind,
    taskType: input.taskType,
    requiredCapabilities: input.requiredCapabilities,
    sideEffectsPerformed: false,
    providerApiCalled: false,
    providerAdapterInstantiated: false,
    runtimeExecutionChanged: false,
  });
}

function withDiagnostics(result: Omit<LucaProviderHubRouteHandoffResult, "safeDiagnosticsText">, input: LucaProviderHubRouteHandoffInput): LucaProviderHubRouteHandoffResult {
  return { ...result, safeDiagnosticsText: diagnostics(result, input) };
}

function fallback(input: LucaProviderHubRouteHandoffInput, handoffStatus: LucaProviderHubRouteHandoffStatus, reason: string, fallbackReasonCode: LucaProviderHubFinalRouteFallbackReason): LucaProviderHubRouteHandoffResult {
  return withDiagnostics({
    shouldUseProviderHubRoute: false,
    handoffRoute: input.currentRoute,
    fallbackRoute: input.currentRoute,
    selectedProviderId: input.providerHubSelectedProviderId,
    selectedModelId: input.providerHubSelectedModelId,
    handoffStatus,
    reason,
    fallbackReasonCode,
    fallbackReason: reason,
    routeSource: "current_provider_factory",
    flagDisabledRestoresCurrentRoute: true,
    sideEffectsPerformed: false,
    providerApiCalled: false,
    providerAdapterInstantiated: false,
    runtimeExecutionChanged: false,
  }, input);
}

export function createProviderHubProviderFactoryRouteHandoff(input: LucaProviderHubRouteHandoffInput): LucaProviderHubRouteHandoffResult {
  if (!input.runtimeRouteSelectionEnabled) return fallback(input, "disabled", "Provider Hub runtime route selection is disabled; using the current ProviderFactory route.", "flag_disabled");
  if (!USABLE_DECISIONS.has(input.decisionStatus)) return fallback(input, "blocked_decision", `Provider Hub decision '${input.decisionStatus}' is not eligible for runtime handoff; using the current ProviderFactory route.`, "blocked_decision");
  if (!input.shouldUseProviderHubRoute) return fallback(input, "fallback_current_route", "Provider Hub selection is not usable for runtime handoff; using the current ProviderFactory route.", "provider_hub_not_selected");
  if (!input.providerHubSelectedProviderId) return fallback(input, "fallback_current_route", "Provider Hub did not select a provider; using the current ProviderFactory route.", "provider_hub_not_selected");

  const providerId = input.providerHubSelectedProviderId;
  const model = modelFor(input);
  let handoffRoute: ModelProvisioningRoute | undefined;

  if (providerId === "luca_prime") {
    handoffRoute = { kind: "LUCA_PRIME", provider: input.currentRoute.kind === "LOCAL" ? "gemini" : input.currentRoute.provider, model };
  } else if (providerId === "ollama") {
    if (!hasConfiguredString(input.settings, "ollamaBaseUrl")) return fallback(input, "missing_configuration", "Provider Hub selected Ollama, but no configured Ollama base URL is available; using the current ProviderFactory route without starting local runtimes.", "missing_configuration");
    handoffRoute = { kind: "LOCAL", runtime: "ollama", model, modelId: model.startsWith("local/") ? model.split("/")[1] : model };
  } else {
    const provider = MAPPED_BYOK_PROVIDERS[providerId];
    if (!provider) return fallback(input, "unsupported_provider", `Provider Hub selected '${providerId}', which is not safely mapped to ProviderFactory in this handoff layer; using the current route.`, "unsupported_provider");
    const apiKeyField = API_KEY_BY_PROVIDER[providerId];
    if (!hasConfiguredString(input.settings, apiKeyField)) return fallback(input, "missing_configuration", `Provider Hub selected '${providerId}', but required user configuration is missing; using the current ProviderFactory route.`, "missing_configuration");
    handoffRoute = { kind: "BYOK", provider, model, apiKeySource: "user_settings" };
  }

  return withDiagnostics({
    shouldUseProviderHubRoute: true,
    handoffRoute,
    fallbackRoute: input.currentRoute,
    selectedProviderId: providerId,
    selectedModelId: input.providerHubSelectedModelId,
    handoffStatus: "mapped",
    routeSource: "provider_hub_handoff",
    flagDisabledRestoresCurrentRoute: true,
    reason: `Provider Hub selected '${providerId}' and the guarded handoff mapped it to an existing ProviderFactory route shape; existing ProviderFactory adapter creation remains the execution path.`,
    sideEffectsPerformed: false,
    providerApiCalled: false,
    providerAdapterInstantiated: false,
    runtimeExecutionChanged: false,
  }, input);
}
