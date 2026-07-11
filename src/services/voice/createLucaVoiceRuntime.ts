import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceOpenAICompatibleAudioApi } from "./VoiceOpenAICompatibleAudioApi";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { VoiceRuntime } from "./VoiceRuntime";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceStreamingRuntime } from "./VoiceStreamingRuntime";
import { createRealtimeVoiceSessionController } from "./createRealtimeVoiceSessionController";
import { HfRealtimeVoiceRuntime, type HfRealtimeVoiceRuntimeOptions } from "./HfRealtimeVoiceRuntime";
import { createVoiceProviderAdapters } from "./createVoiceProviderAdapters";
import { createVoiceRealProviderAdapterShell } from "./createVoiceRealProviderAdapterShell";
import { evaluateVoiceProviderReadiness } from "./VoiceProviderReadiness";
import { type LucaVoiceOpenAICompatibleProviderOptions, type LucaVoiceRealProviderFeatureFlags } from "./types";

export interface LucaVoiceRuntimeFactoryOptions {
  registerScaffoldProviderAdapters?: boolean;
  enableLocalVoiceAdapter?: boolean;
  enableLucaPrimeVoiceAdapter?: boolean;
  enableByokVoiceAdapter?: boolean;
  enableInMemoryTape?: boolean;
  realProviderFeatureFlags?: LucaVoiceRealProviderFeatureFlags;
  openAICompatibleProviderOptions?: LucaVoiceOpenAICompatibleProviderOptions;
  hfRealtime?: Omit<HfRealtimeVoiceRuntimeOptions, "controller">;
}

export function createLucaVoiceRuntime(options: LucaVoiceRuntimeFactoryOptions = {}) {
  const registry = new VoiceBackendRegistry();
  const tapeSink = new VoiceInMemoryTapeSink();
  const eventBridge = new VoiceRuntimeEventBridge(tapeSink);

  const providerAdapters = createVoiceProviderAdapters({ registry });
  const providerRouter = new VoiceProviderRouter(registry);
  const runtime = new VoiceRuntime(registry, { recording: { enabled: options.enableInMemoryTape ?? true, sink: tapeSink } }, eventBridge);
  const streamingRuntime = new VoiceStreamingRuntime(providerRouter, eventBridge);
  const audioApi = new VoiceOpenAICompatibleAudioApi(providerRouter, registry);
  const realtimeVoiceController = createRealtimeVoiceSessionController({
    runtime,
    streamingRuntime,
    eventBridge,
  }).controller;
  const hfRealtimeRuntime = options.hfRealtime
    ? new HfRealtimeVoiceRuntime({
        ...options.hfRealtime,
        controller: realtimeVoiceController,
      })
    : undefined;

  const flags = {
    registerScaffoldProviderAdapters: options.registerScaffoldProviderAdapters ?? true,
    enableLocalVoiceAdapter: options.enableLocalVoiceAdapter ?? true,
    enableLucaPrimeVoiceAdapter: options.enableLucaPrimeVoiceAdapter ?? true,
    enableByokVoiceAdapter: options.enableByokVoiceAdapter ?? true,
  };

  const registerEnabledAdapters = () => {
    if (!flags.registerScaffoldProviderAdapters) return;
    if (flags.enableLocalVoiceAdapter) providerAdapters.localAdapter.registerBackends(registry);
    if (flags.enableLucaPrimeVoiceAdapter) providerAdapters.lucaPrimeAdapter.registerBackends(registry);
    if (flags.enableByokVoiceAdapter) providerAdapters.byokAdapter.registerBackends(registry);
  };

  registerEnabledAdapters();

  const realProviderFeatureFlags = options.realProviderFeatureFlags ?? {};
  const realProviderAdapterShell = createVoiceRealProviderAdapterShell(providerRouter, {
    featureFlags: realProviderFeatureFlags,
    openAICompatibleProviderOptions: options.openAICompatibleProviderOptions,
  });

  const getProviderReadinessSummary = () => ({
    local: {
      stt: evaluateVoiceProviderReadiness({
        providerKind: "local",
        capability: "stt",
        featureFlags: realProviderFeatureFlags,
        backendAvailable: registry.selectSTTBackend({ providerKind: "local" }) !== undefined,
      }),
      tts: evaluateVoiceProviderReadiness({
        providerKind: "local",
        capability: "tts",
        featureFlags: realProviderFeatureFlags,
        backendAvailable: registry.selectTTSBackend({ providerKind: "local" }) !== undefined,
      }),
    },
    cloud: {
      stt: evaluateVoiceProviderReadiness({
        providerKind: "cloud",
        capability: "stt",
        featureFlags: realProviderFeatureFlags,
        backendAvailable: registry.selectSTTBackend({ providerKind: "cloud" }) !== undefined,
      }),
      tts: evaluateVoiceProviderReadiness({
        providerKind: "cloud",
        capability: "tts",
        featureFlags: realProviderFeatureFlags,
        backendAvailable: registry.selectTTSBackend({ providerKind: "cloud" }) !== undefined,
      }),
    },
    byok: {
      stt: evaluateVoiceProviderReadiness({
        providerKind: "byok",
        capability: "stt",
        featureFlags: realProviderFeatureFlags,
        backendAvailable: registry.selectSTTBackend({ providerKind: "byok" }) !== undefined,
      }),
      tts: evaluateVoiceProviderReadiness({
        providerKind: "byok",
        capability: "tts",
        featureFlags: realProviderFeatureFlags,
        backendAvailable: registry.selectTTSBackend({ providerKind: "byok" }) !== undefined,
      }),
    },
  });


  return {
    registry,
    providerRouter,
    runtime,
    streamingRuntime,
    audioApi,
    tapeSink,
    eventBridge,
    realtimeVoiceController,
    hfRealtimeRuntime,
    providerAdapters,
    realProviderAdapterShell,
    getSnapshot: () => {
      const registrySnapshot = registry.getSnapshot();
      return {
        registeredSttBackendCount: registrySnapshot.sttBackends.length,
        registeredTtsBackendCount: registrySnapshot.ttsBackends.length,
        providerAdapterSnapshots: providerAdapters.getSnapshots(),
        realProviderFeatureFlags,
        providerReadinessSummary: getProviderReadinessSummary(),
        realProviderAdapterShellSnapshot: realProviderAdapterShell.getSnapshot(),
        routerSnapshot: providerRouter.getSnapshot(),
        runtimeState: runtime.getState(),
        streamingSnapshot: streamingRuntime.getSnapshot(),
        audioApiSnapshot: audioApi.getSnapshot(),
        realtimeVoiceControllerSnapshot: realtimeVoiceController.getSnapshot(),
        hfRealtimeRuntimeSnapshot: hfRealtimeRuntime?.getSnapshot(),
        tapeSnapshot: (options.enableInMemoryTape ?? true) ? tapeSink.getSnapshot() : undefined,
        metadata: {
          factoryKind: "luca_voice_runtime_scaffold" as const,
          audioApisCalled: false as const,
          microphoneApisCalled: false as const,
          sttApisCalled: false as const,
          ttsApisCalled: false as const,
          providerApisCalled: false as const,
          networkApisCalled: false as const,
          heavyModelsLoaded: false as const,
          systemApisCalled: false as const,
          requiresExplicitOptIn: true as const,
        },
      };
    },
    reset: () => {
      runtime.reset();
      streamingRuntime.reset();
      audioApi.reset();
      providerRouter.reset();
      if (options.enableInMemoryTape ?? true) {
        tapeSink.reset();
      }
      realtimeVoiceController.reset();
      hfRealtimeRuntime?.disconnect();
      providerAdapters.reset();
      realProviderAdapterShell.reset();
      registerEnabledAdapters();
    },
  };
}
