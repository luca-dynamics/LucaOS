import { LLMProvider } from "./LLMProvider";
import { GeminiAdapter } from "./GeminiAdapter";
import { AnthropicAdapter } from "./AnthropicAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { LocalLLMAdapter } from "./LocalLLMAdapter";
import { GrokAdapter } from "./GrokAdapter";
import { DeepSeekAdapter } from "./DeepSeekAdapter";
import { LucaSettings, settingsService } from "../settingsService";
import { LOCAL_BRAIN_MODEL_IDS } from "../ModelManagerService";
import { BRAIN_CONFIG } from "../../config/brain.config";
import { ollamaUrl } from "../../config/api";
import {
  createProviderFactoryShadowSelection,
  getProviderHubIdForProviderFactoryRoute,
  type LucaProviderFactoryShadowSelection,
} from "../../model-router/providerHubProviderFactoryShadowHook";
import {
  createProviderHubProviderFactoryRouteHandoff,
  type LucaProviderHubFinalRouteFallbackReason,
  type LucaProviderHubRouteHandoffResult,
} from "../../model-router/providerHubProviderFactoryRouteHandoff";
import { resolveProviderHubTaskRoutePolicy } from "../../model-router/providerHubTaskRoutePolicies";

export type CloudProviderId =
  | "gemini"
  | "anthropic"
  | "openai"
  | "xai"
  | "groq"
  | "deepseek";

export type ModelProvisioningRoute =
  | {
      kind: "LUCA_PRIME";
      provider: CloudProviderId;
      model: string;
    }
  | {
      kind: "BYOK";
      provider: CloudProviderId;
      model: string;
      apiKeySource: "user_settings";
    }
  | {
      kind: "LOCAL";
      runtime: "ollama" | "internal";
      model: string;
      modelId: string;
    };

export interface LucaProviderFactoryFinalRouteDecision {
  readonly currentRoute: ModelProvisioningRoute;
  readonly handoffRoute?: ModelProvisioningRoute;
  readonly finalRoute: ModelProvisioningRoute;
  readonly fallbackRoute: ModelProvisioningRoute;
  readonly usedProviderHubHandoff: boolean;
  readonly routeSource: "current_provider_factory" | "provider_hub_handoff";
  readonly flagDisabledRestoresCurrentRoute: boolean;
  readonly handoffStatus: LucaProviderHubRouteHandoffResult["handoffStatus"];
  readonly reason: string;
  readonly fallbackReasonCode?: LucaProviderHubFinalRouteFallbackReason;
  readonly fallbackReason?: string;
  readonly safeDiagnosticsText: string;
  readonly providerApiCalledDuringSelection: false;
  readonly providerAdapterInstantiatedByHandoffMapper: false;
  readonly runtimeExecutionChanged: boolean;
}

function routeKey(route: ModelProvisioningRoute): string {
  return JSON.stringify(route);
}

function routeSummary(route: ModelProvisioningRoute): string {
  if (route.kind === "LOCAL") return `${route.kind}:${route.runtime}:${route.model}`;
  return `${route.kind}:${route.provider}:${route.model}`;
}

export function isProviderHubRuntimeRouteSelectionActive(settings: Pick<LucaSettings, "providerHub">): boolean {
  return Boolean(settings.providerHub?.runtimeRouteSelectionEnabled);
}

function fallbackCodeForHandoff(handoff: LucaProviderHubRouteHandoffResult | undefined, runtimeRouteSelectionEnabled: boolean): LucaProviderHubFinalRouteFallbackReason {
  if (!runtimeRouteSelectionEnabled) return "flag_disabled";
  if (!handoff) return "no_handoff_result";
  if (handoff.fallbackReasonCode) return handoff.fallbackReasonCode;
  if (handoff.handoffStatus === "blocked_decision") return "blocked_decision";
  if (handoff.handoffStatus === "missing_configuration") return "missing_configuration";
  if (handoff.handoffStatus === "unsupported_provider") return "unsupported_provider";
  if (handoff.handoffStatus === "disabled") return "flag_disabled";
  if (handoff.handoffStatus !== "mapped") return "handoff_not_mapped";
  return "safety_guard";
}

export function createFinalRouteDecision(
  currentRoute: ModelProvisioningRoute,
  handoff: LucaProviderHubRouteHandoffResult | undefined,
  runtimeRouteSelectionEnabled: boolean,
): LucaProviderFactoryFinalRouteDecision {
  const handoffEligible = runtimeRouteSelectionEnabled
    && Boolean(handoff?.shouldUseProviderHubRoute)
    && handoff?.handoffStatus === "mapped";
  const finalRoute = handoffEligible ? handoff!.handoffRoute : currentRoute;
  const runtimeExecutionChanged = handoffEligible && routeKey(finalRoute) !== routeKey(currentRoute);
  const fallbackReasonCode = handoffEligible ? undefined : fallbackCodeForHandoff(handoff, runtimeRouteSelectionEnabled);
  const fallbackReason = handoffEligible ? undefined : handoff?.reason ?? "Provider Hub handoff did not return a route decision; using the current ProviderFactory route.";
  const routeSource = handoffEligible ? "provider_hub_handoff" : "current_provider_factory";

  const diagnostics = JSON.stringify({
    currentRoute: routeSummary(currentRoute),
    handoffRoute: handoff?.handoffStatus === "mapped" ? routeSummary(handoff.handoffRoute) : null,
    fallbackRoute: routeSummary(currentRoute),
    finalRoute: routeSummary(finalRoute),
    usedProviderHubHandoff: handoffEligible,
    routeSource,
    flagDisabledRestoresCurrentRoute: true,
    handoffStatus: handoff?.handoffStatus ?? "fallback_current_route",
    reason: handoffEligible ? "Provider Hub handoff route passed all final ProviderFactory execution guards." : "Current ProviderFactory route remains active because Provider Hub handoff was not eligible.",
    fallbackReasonCode: fallbackReasonCode ?? null,
    fallbackReason: fallbackReason ?? null,
    providerApiCalledDuringSelection: false,
    providerAdapterInstantiatedByHandoffMapper: false,
    runtimeExecutionChanged,
  });

  return {
    currentRoute,
    handoffRoute: handoff?.handoffStatus === "mapped" ? handoff.handoffRoute : undefined,
    finalRoute,
    fallbackRoute: currentRoute,
    usedProviderHubHandoff: handoffEligible,
    routeSource,
    flagDisabledRestoresCurrentRoute: true,
    handoffStatus: handoff?.handoffStatus ?? "fallback_current_route",
    reason: handoffEligible ? "Provider Hub handoff route passed all final ProviderFactory execution guards; adapter creation will still use createProviderForRoute(...)." : "Current ProviderFactory route remains active because Provider Hub handoff was not eligible for execution.",
    fallbackReasonCode,
    fallbackReason,
    safeDiagnosticsText: diagnostics,
    providerApiCalledDuringSelection: false,
    providerAdapterInstantiatedByHandoffMapper: false,
    runtimeExecutionChanged,
  };
}


export interface LucaProviderHubChatRuntimeGuardSummary {
  readonly currentRoute: ModelProvisioningRoute;
  readonly handoffRoute?: ModelProvisioningRoute;
  readonly finalRoute: ModelProvisioningRoute;
  readonly routeSource: LucaProviderFactoryFinalRouteDecision["routeSource"];
  readonly fallbackReasonCode?: LucaProviderHubFinalRouteFallbackReason;
  readonly runtimeRouteSelectionEnabled: boolean;
  readonly sideEffectsPerformed: false;
  readonly providerApiCalledDuringSelection: false;
  readonly automaticConnectionTestStarted: false;
  readonly localRuntimeStarted: false;
  readonly providerAdapterInstantiatedByHandoffMapper: false;
  readonly safeDiagnosticsText: string;
}

export function createProviderHubChatRuntimeGuardSummary(
  decision: LucaProviderFactoryFinalRouteDecision,
  runtimeRouteSelectionEnabled: boolean,
): LucaProviderHubChatRuntimeGuardSummary {
  const safeDiagnosticsText = JSON.stringify({
    currentRoute: routeSummary(decision.currentRoute),
    handoffRoute: decision.handoffRoute ? routeSummary(decision.handoffRoute) : null,
    finalRoute: routeSummary(decision.finalRoute),
    routeSource: decision.routeSource,
    fallbackReasonCode: decision.fallbackReasonCode ?? null,
    runtimeRouteSelectionEnabled,
    sideEffectsPerformed: false,
    providerApiCalledDuringSelection: false,
    automaticConnectionTestStarted: false,
    localRuntimeStarted: false,
    providerAdapterInstantiatedByHandoffMapper: false,
    adapterCreationPath: "createProviderForRoute",
  });

  return {
    currentRoute: decision.currentRoute,
    handoffRoute: decision.handoffRoute,
    finalRoute: decision.finalRoute,
    routeSource: decision.routeSource,
    fallbackReasonCode: decision.fallbackReasonCode,
    runtimeRouteSelectionEnabled,
    sideEffectsPerformed: false,
    providerApiCalledDuringSelection: false,
    automaticConnectionTestStarted: false,
    localRuntimeStarted: false,
    providerAdapterInstantiatedByHandoffMapper: false,
    safeDiagnosticsText,
  };
}

/**
 * ProviderFactory - Unified LLM Provider Routing
 */
export class ProviderFactory {
  private static lastProviderHubShadowSelection: LucaProviderFactoryShadowSelection | undefined;
  private static lastProviderHubRouteHandoff: LucaProviderHubRouteHandoffResult | undefined;
  private static lastFinalRouteDecision: LucaProviderFactoryFinalRouteDecision | undefined;

  static getLastProviderHubShadowSelection(): LucaProviderFactoryShadowSelection | undefined {
    return this.lastProviderHubShadowSelection;
  }

  static getLastProviderHubRouteHandoff(): LucaProviderHubRouteHandoffResult | undefined {
    return this.lastProviderHubRouteHandoff;
  }

  static getLastFinalRouteDecision(): LucaProviderFactoryFinalRouteDecision | undefined {
    return this.lastFinalRouteDecision;
  }

  static resolveProvisioningRouteWithDiagnostics(
    settings: LucaSettings["brain"],
    persona?: string,
    providerOverride?: string,
  ): { route: ModelProvisioningRoute; providerHubShadowSelection?: LucaProviderFactoryShadowSelection; providerHubRouteHandoff?: LucaProviderHubRouteHandoffResult; finalRouteDecision: LucaProviderFactoryFinalRouteDecision } {
    const route = this.resolveProvisioningRoute(settings, persona, providerOverride);
    const allSettings = { ...settingsService.getSettings(), brain: settings };
    const runtimeRouteSelectionEnabled = Boolean(allSettings.providerHub?.runtimeRouteSelectionEnabled);
    const providerId = getProviderHubIdForProviderFactoryRoute(route);
    const chatPolicy = resolveProviderHubTaskRoutePolicy({
      taskType: "chat",
      preferenceOverride: route.kind === "LOCAL" ? "local_first" : route.kind === "BYOK" ? "cloud_first" : undefined,
      allowPaidProvidersOverride: route.kind !== "LOCAL",
      allowCloudProvidersOverride: route.kind !== "LOCAL",
    });
    const shadow = createProviderFactoryShadowSelection({
      currentRuntimeProviderId: providerId,
      currentRuntimeModelId: route.model,
      currentRouteMode: route.kind,
      taskType: chatPolicy.taskType,
      requiredCapabilities: chatPolicy.requiredCapabilities,
      currentSettingsSnapshot: allSettings,
      routePreference: chatPolicy.preference,
      runtimeRouteSelectionEnabled,
      allowFallbacks: chatPolicy.allowFallbacks,
      allowPaidProviders: chatPolicy.allowPaidProviders,
      allowLocalProviders: chatPolicy.allowLocalProviders,
      allowCloudProviders: chatPolicy.allowCloudProviders,
      observedAt: new Date().toISOString(),
    });
    const handoff = createProviderHubProviderFactoryRouteHandoff({
      runtimeRouteSelectionEnabled: shadow.providerHubEnabled,
      providerHubSelectedProviderId: shadow.providerHubSelectedProviderId,
      providerHubSelectedModelId: shadow.providerHubSelectedModelId,
      decisionStatus: shadow.decisionStatus,
      shouldUseProviderHubRoute: shadow.shouldUseProviderHubRoute,
      currentRoute: route,
      settings,
      taskType: chatPolicy.taskType,
      requiredCapabilities: chatPolicy.requiredCapabilities,
    });
    const finalRouteDecision = createFinalRouteDecision(route, handoff, runtimeRouteSelectionEnabled);
    this.lastProviderHubShadowSelection = shadow;
    this.lastProviderHubRouteHandoff = handoff;
    this.lastFinalRouteDecision = finalRouteDecision;
    return { route: finalRouteDecision.finalRoute, providerHubShadowSelection: shadow, providerHubRouteHandoff: handoff, finalRouteDecision };
  }
  static resolveProvisioningRoute(
    settings: LucaSettings["brain"],
    persona?: string,
    providerOverride?: string,
  ): ModelProvisioningRoute {
    const { model, useCustomApiKey } = settings;

    // 1. Handle Explicit Provider Override (Active Routing)
    if (providerOverride) {
      const provider = providerOverride.toLowerCase() as CloudProviderId;
      // Map 'groq' to compatible models if the current one isn't
      const finalModel = provider === "groq" && !model.includes("llama") && !model.includes("mixtral")
        ? "llama3-70b-8192" 
        : model;

      return useCustomApiKey
        ? {
            kind: "BYOK",
            provider,
            model: finalModel,
            apiKeySource: "user_settings",
          }
        : {
            kind: "LUCA_PRIME",
            provider,
            model: finalModel,
          };
    }

    if (persona === "LOCALCORE") {
      const modelId = model.includes("/") ? model.split("/")[1] : model;
      return {
        kind: "LOCAL",
        runtime: "internal",
        model,
        modelId,
      };
    }

    const isExplicitLocal =
      model.startsWith("local/") ||
      model.includes(":") ||
      LOCAL_BRAIN_MODEL_IDS.includes(model);

    if (isExplicitLocal) {
      const modelId = model.startsWith("local/") ? model.split("/")[1] : model;
      return {
        kind: "LOCAL",
        runtime: model.includes(":") ? "ollama" : "internal",
        model,
        modelId,
      };
    }

    const provider = this.resolveCloudProvider(model);
    return useCustomApiKey
      ? {
          kind: "BYOK",
          provider,
          model,
          apiKeySource: "user_settings",
        }
      : {
          kind: "LUCA_PRIME",
          provider,
          model,
        };
  }

  static createProviderForRoute(
    route: ModelProvisioningRoute,
    settings: LucaSettings["brain"],
  ): LLMProvider {
    if (route.kind === "LOCAL") {
      return new LocalLLMAdapter(route.modelId);
    }

    const resolveKey = (userKey: string | undefined) =>
      route.kind === "BYOK" ? userKey || "" : "";

    if (route.provider === "gemini") {
      return new GeminiAdapter(resolveKey(settings.geminiApiKey), route.model);
    }

    if (route.provider === "anthropic") {
      return new AnthropicAdapter(
        resolveKey(settings.anthropicApiKey),
        route.model,
      );
    }

    if (route.provider === "openai") {
      return new OpenAIAdapter(resolveKey(settings.openaiApiKey), route.model);
    }

    if (route.provider === "groq") {
      // Groq uses OpenAIAdapter with custom base URL
      return new OpenAIAdapter(
        resolveKey(settings.groqApiKey || settings.openaiApiKey), 
        route.model,
        "https://api.groq.com/openai/v1"
      );
    }

    if (route.provider === "xai") {
      return new GrokAdapter(
        resolveKey(settings.xaiApiKey),
        route.model,
        (settings as any).xaiBaseUrl,
      );
    }

    if (route.provider === "deepseek") {
      return new DeepSeekAdapter(
        resolveKey(settings.deepseekApiKey),
        route.model,
      );
    }

    console.warn(
      `[ProviderFactory] Unknown route provider "${String(
        (route as any).provider,
      )}", defaulting to Luca Prime.`,
    );
    return new GeminiAdapter("", BRAIN_CONFIG.defaults.brain);
  }

  private static resolveCloudProvider(model: string): CloudProviderId {
    if (model.startsWith("claude")) return "anthropic";
    if (model.startsWith("gpt") || model.startsWith("o1")) return "openai";
    if (model.startsWith("grok")) return "xai";
    if (model.startsWith("deepseek")) return "deepseek";
    if (model.startsWith("llama") || model.startsWith("mixtral")) return "groq";
    return "gemini";
  }

/**
   * Synchronous creation of provider based on settings.
   *
   * THREE-TIER MODEL:
   *   TIER 1 - Luca Prime (default): Enterprise key from env vars, no user setup needed.
   *            `useCustomApiKey: false` → adapters receive "" which defers to getGenClient() singleton.
   *   TIER 2 - BYOK (opt-in):         User supplies their own key to replace the enterprise key.

   *            `useCustomApiKey: true` → adapters receive the user's stored key.
   *   TIER 3 - Local (opt-in):         Onboard models or Ollama, completely bypasses keys.
   */
  static createProvider(
    settings: LucaSettings["brain"],
    persona?: string,
    providerOverride?: string,
  ): LLMProvider {
    const { route } = this.resolveProvisioningRouteWithDiagnostics(settings, persona, providerOverride);
    return this.createProviderForRoute(route, settings);
  }


  /**
   * Async creation of provider with health checks.
   * DESIGN: Respect explicit user choice first. Only fall back if the model is
   * ambiguous (e.g., local model set but no local service running).
   */
  static async createHealthyProvider(
    settings: LucaSettings["brain"],
    persona?: string,
  ): Promise<LLMProvider> {
    const { model } = settings;

    // 1. If an explicit cloud model is set (claude-*, gpt-*, grok-*, deepseek-*),
    //    trust it and route directly — no health check, no fallback.
    const isExplicitCloud =
      model.startsWith("claude") ||
      model.startsWith("gpt") ||
      model.startsWith("o1") ||
      model.startsWith("grok") ||
      model.startsWith("deepseek");

    if (isExplicitCloud) {
      console.log(`[ProviderFactory] Explicit cloud model set: ${model}. Routing directly without fallback.`);
      return this.createProvider(settings, persona);
    }

    // 2. If an explicit local model is set, route to local.
    //    If local service is unreachable, surface the error clearly instead of silently
    //    swapping to Gemini.
    const isLocal =
      persona === "LOCALCORE" ||
      model.startsWith("local/") ||
      model.includes(":") || // Ollama tags (e.g. gemma2:2b)
      model.includes("embed") || // Local embedding models
      LOCAL_BRAIN_MODEL_IDS.includes(model);

    if (isLocal) {
      console.log(`[ProviderFactory] Local model selected: ${model}. Routing to LocalLLMAdapter.`);
      // Return the local adapter regardless — it will surface a clear "connection refused" error
      // to the user rather than silently burning cloud quota.
      return this.createProvider(settings, persona);
    }

    // 3. Gemini model selected — route directly, no fallback needed.
    if (model.startsWith("gemini")) {
      return this.createProvider(settings, persona);
    }

    // 4. Fallback for truly unknown/empty model ID — pick the best available cloud.
    console.warn(`[ProviderFactory] Unknown model ID "${model}". Selecting best available provider.`);
    const bestCloud = settingsService.getBestAvailableCloudProvider();
    const fallbackSettings = { ...settings };
    if (bestCloud === "anthropic") {
      fallbackSettings.model = "claude-3-5-sonnet-latest";
    } else if (bestCloud === "openai") {
      fallbackSettings.model = "gpt-4o";
    } else if (bestCloud === "xai") {
      fallbackSettings.model = "grok-2-1212";
    } else if (bestCloud === "deepseek") {
      fallbackSettings.model = "deepseek-chat";
    } else {
      // Absolute last resort: Gemini with hardcoded default
      fallbackSettings.model = BRAIN_CONFIG.defaults.brain;
    }

    return this.createProvider(fallbackSettings, persona);
  }

  /**
   * Specifically creates a provider that IS capable of embeddings.
   * If current brain doesn't support it, falls back to OpenAI or Gemini.
   */
  static async createEmbeddingProvider(
    settings: LucaSettings["brain"],
  ): Promise<LLMProvider> {
    const provider = this.createProvider(settings);

    // If provider supports it natively, use it
    if (provider.embed) return provider;

    // Fallback hierarchy for memory
    const hasOpenAI = !!settings.openaiApiKey;
    const hasGemini = !!settings.geminiApiKey;

    if (hasGemini) {
      return new GeminiAdapter(settings.geminiApiKey!, BRAIN_CONFIG.defaults.embedding);
    }

    if (hasOpenAI) {
      return new OpenAIAdapter(settings.openaiApiKey!, "gpt-4o");
    }

    // Extreme fallback: singleton Gemini
    return new GeminiAdapter("", BRAIN_CONFIG.defaults.embedding);
  }

  /**
   * Quick health check for Ollama loopback
   */
  private static async checkLocalHealth(): Promise<boolean> {
    try {
      const resp = await fetch(ollamaUrl(""), {
        signal: AbortSignal.timeout(1500),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  /**
   * Validates a specific API key without changing system settings.
   * Internal utility for UI 'Verify' buttons.
   */
  static async validateSpecificKey(
    providerId: string,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<{ valid: boolean; message: string }> {
    let provider: LLMProvider | undefined;

    if (providerId === "gemini") {
      provider = new GeminiAdapter(apiKey, model);
    } else if (providerId === "anthropic") {
      provider = new AnthropicAdapter(apiKey, model);
    } else if (providerId === "openai") {
      provider = new OpenAIAdapter(apiKey, model);
      if (baseUrl) (provider as any).client.baseURL = baseUrl;
    } else if (providerId === "xai") {
      provider = new GrokAdapter(apiKey, model, baseUrl);
    } else if (providerId === "deepseek") {
      provider = new DeepSeekAdapter(apiKey, model);
      if (baseUrl) (provider as any).client.baseURL = baseUrl;
    }

    if (!provider) {
      return { valid: false, message: `Unknown provider: ${providerId}` };
    }

    return provider.validateKey();
  }
}
