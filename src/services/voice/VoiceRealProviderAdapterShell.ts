import { evaluateVoiceProviderReadiness } from "./VoiceProviderReadiness";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import {
  VoiceOpenAICompatibleProviderAdapter,
} from "./VoiceOpenAICompatibleProviderAdapter";
import {
  type LucaVoiceProviderReadinessResult,
  type LucaVoiceOpenAICompatibleProviderOptions,
  type LucaVoiceRealProviderAdapterRequest,
  type LucaVoiceRealProviderAdapterResult,
  type LucaVoiceRealProviderFeatureFlags,
} from "./types";

const REAL_PROVIDER_ADAPTER_SHELL_METADATA = {
  adapterKind: "voice_real_provider_adapter_shell" as const,
  shellOnly: true as const,
  realProviderExecutionEnabled: false as const,
  audioApisCalled: false as const,
  microphoneApisCalled: false as const,
  sttApisCalled: false as const,
  ttsApisCalled: false as const,
  providerApisCalled: false as const,
  networkApisCalled: false as const,
  heavyModelsLoaded: false as const,
  systemApisCalled: false as const,
  requiresExplicitOptIn: true as const,
};

export interface VoiceRealProviderAdapterShellOptions {
  featureFlags?: LucaVoiceRealProviderFeatureFlags;
  readinessOverrides?: {
    backendAvailable?: boolean;
    credentialsAvailable?: boolean;
    modelAvailable?: boolean;
    networkAllowed?: boolean;
    localModelLoadingAllowed?: boolean;
  };
  openAICompatibleProviderOptions?: LucaVoiceOpenAICompatibleProviderOptions;
}

export interface VoiceRealProviderAdapterShellSnapshot {
  kind: "voice_real_provider_adapter_shell";
  totalInvocations: number;
  statusCounts: Record<LucaVoiceRealProviderAdapterResult["status"], number>;
  lastResult?: LucaVoiceRealProviderAdapterResult;
  openAICompatibleProviderAdapterSnapshot?: ReturnType<VoiceOpenAICompatibleProviderAdapter["getSnapshot"]>;
  metadata: typeof REAL_PROVIDER_ADAPTER_SHELL_METADATA;
}

export class VoiceRealProviderAdapterShell {
  private totalInvocations = 0;
  private statusCounts: VoiceRealProviderAdapterShellSnapshot["statusCounts"] = {
    disabled: 0,
    blocked: 0,
    ready: 0,
    invocation_disabled: 0,
  };

  private lastResult?: LucaVoiceRealProviderAdapterResult;
  private readonly openAICompatibleProviderAdapter?: VoiceOpenAICompatibleProviderAdapter;

  constructor(
    private readonly providerRouter: VoiceProviderRouter,
    private readonly options: VoiceRealProviderAdapterShellOptions = {},
  ) {
    if (options.openAICompatibleProviderOptions) {
      this.openAICompatibleProviderAdapter = new VoiceOpenAICompatibleProviderAdapter(options.openAICompatibleProviderOptions);
    }
  }

  invoke(request: LucaVoiceRealProviderAdapterRequest): LucaVoiceRealProviderAdapterResult {
    this.totalInvocations += 1;

    const route = this.providerRouter.route({
      capability: request.capability,
      preference: request.providerKind,
      language: request.language,
      metadata: request.metadata,
    });

    const readiness = this.evaluateReadiness(request, route.selectedProviderKind);

    if (readiness.status === "blocked") {
      return this.finish(request, {
        ok: false,
        status: "blocked",
        reason: "provider_readiness_blocked",
      });
    }

    if (readiness.status === "scaffold_only") {
      return this.finish(request, {
        ok: false,
        status: "invocation_disabled",
        selectedBackendId: route.selectedBackendId,
        selectedProviderKind: route.selectedProviderKind,
        reason: "real_provider_invocation_disabled",
      });
    }

    return this.finish(request, {
      ok: true,
      status: "ready",
      selectedBackendId: route.selectedBackendId,
      selectedProviderKind: route.selectedProviderKind,
      outputPlaceholder: "real provider adapter shell: invocation intentionally disabled",
      reason: "real_provider_shell_ready_without_invocation",
    });
  }

  getSnapshot(): VoiceRealProviderAdapterShellSnapshot {
    return {
      kind: "voice_real_provider_adapter_shell",
      totalInvocations: this.totalInvocations,
      statusCounts: { ...this.statusCounts },
      lastResult: this.lastResult,
      metadata: REAL_PROVIDER_ADAPTER_SHELL_METADATA,
      openAICompatibleProviderAdapterSnapshot: this.openAICompatibleProviderAdapter?.getSnapshot(),
    };
  }

  reset(): void {
    this.totalInvocations = 0;
    this.lastResult = undefined;
    this.statusCounts = {
      disabled: 0,
      blocked: 0,
      ready: 0,
      invocation_disabled: 0,
    };
    this.openAICompatibleProviderAdapter?.reset();
  }

  private evaluateReadiness(
    request: LucaVoiceRealProviderAdapterRequest,
    selectedProviderKind = request.providerKind,
  ): LucaVoiceProviderReadinessResult {
    return evaluateVoiceProviderReadiness({
      providerKind: selectedProviderKind,
      capability: request.capability,
      featureFlags: this.options.featureFlags,
      ...this.options.readinessOverrides,
    });
  }

  private finish(
    request: LucaVoiceRealProviderAdapterRequest,
    result: Omit<LucaVoiceRealProviderAdapterResult, "metadata">,
  ): LucaVoiceRealProviderAdapterResult {
    this.statusCounts[result.status] += 1;
    const finalized: LucaVoiceRealProviderAdapterResult = {
      ...result,
      metadata: {
        ...REAL_PROVIDER_ADAPTER_SHELL_METADATA,
        requestProviderKind: request.providerKind,
        requestCapability: request.capability,
        requestAdapterKind: request.adapterKind,
        ...(request.metadata ?? {}),
      },
    };
    this.lastResult = finalized;
    return finalized;
  }
}
