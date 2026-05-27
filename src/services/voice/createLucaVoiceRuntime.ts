import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceOpenAICompatibleAudioApi } from "./VoiceOpenAICompatibleAudioApi";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { VoiceRuntime } from "./VoiceRuntime";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceStreamingRuntime } from "./VoiceStreamingRuntime";
import { createVoiceProviderAdapters } from "./createVoiceProviderAdapters";

export interface LucaVoiceRuntimeFactoryOptions {
  registerScaffoldProviderAdapters?: boolean;
  enableLocalVoiceAdapter?: boolean;
  enableLucaPrimeVoiceAdapter?: boolean;
  enableByokVoiceAdapter?: boolean;
  enableInMemoryTape?: boolean;
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

  return {
    registry,
    providerRouter,
    runtime,
    streamingRuntime,
    audioApi,
    tapeSink,
    eventBridge,
    providerAdapters,
    getSnapshot: () => {
      const registrySnapshot = registry.getSnapshot();
      return {
        registeredSttBackendCount: registrySnapshot.sttBackends.length,
        registeredTtsBackendCount: registrySnapshot.ttsBackends.length,
        providerAdapterSnapshots: providerAdapters.getSnapshots(),
        routerSnapshot: providerRouter.getSnapshot(),
        runtimeState: runtime.getState(),
        streamingSnapshot: streamingRuntime.getSnapshot(),
        audioApiSnapshot: audioApi.getSnapshot(),
        tapeSnapshot: (options.enableInMemoryTape ?? true) ? tapeSink.getSnapshot() : undefined,
        metadata: {
          factoryKind: "luca_voice_runtime_scaffold" as const,
          audioApisCalled: false as const,
          microphoneApisCalled: false as const,
          sttApisCalled: false as const,
          ttsApisCalled: false as const,
          providerApisCalled: false as const,
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
      providerAdapters.reset();
      registerEnabledAdapters();
    },
  };
}
