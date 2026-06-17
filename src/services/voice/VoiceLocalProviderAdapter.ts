import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import {
  LucaSTTBackend,
  LucaTTSBackend,
  LucaVoiceProviderAdapterMetadata,
  LucaVoiceProviderAdapterSnapshot,
} from "./types";

const LOCAL_ADAPTER_KIND = "local_adapter" as const;

export class VoiceLocalProviderAdapter {
  private readonly registeredBackends = new Set<string>();

  registerBackends(registry: VoiceBackendRegistry): string[] {
    const sttBackend: LucaSTTBackend = {
      id: "voice.local.stub.stt",
      label: "Local STT Scaffold",
      providerKind: "local",
      supportsStreaming: true,
      supportedLanguages: ["en", "auto"],
      transcribe: async () => ({
        transcript: "",
        language: "en",
        confidence: 0,
        isFinal: true,
      }),
      getSnapshot: () => ({
        id: "voice.local.stub.stt",
        label: "Local STT Scaffold",
        providerKind: "local",
        supportsStreaming: true,
        supportedLanguages: ["en", "auto"],
      }),
    };

    const ttsBackend: LucaTTSBackend = {
      id: "voice.local.stub.tts",
      label: "Local TTS Scaffold",
      providerKind: "local",
      supportsStreaming: false,
      supportsVoiceClone: false,
      supportsEmotion: false,
      supportedLanguages: ["en", "auto"],
      synthesize: async (input) => ({
        outputEvent: {
          id: `voice.local.output.${input.sessionId}`,
          sessionId: input.sessionId,
          kind: "tts_completed",
          text: input.text,
          voiceId: input.voiceId,
          language: input.language ?? "en",
          isFinal: true,
          metadata: { scaffold: true, providerKind: "local" },
        },
      }),
      getSnapshot: () => ({
        id: "voice.local.stub.tts",
        label: "Local TTS Scaffold",
        providerKind: "local",
        supportsStreaming: false,
        supportsVoiceClone: false,
        supportsEmotion: false,
        supportedLanguages: ["en", "auto"],
      }),
    };

    registry.registerSTTBackend(sttBackend);
    registry.registerTTSBackend(ttsBackend);
    this.registeredBackends.add(sttBackend.id);
    this.registeredBackends.add(ttsBackend.id);

    return Array.from(this.registeredBackends);
  }

  getMetadata(): LucaVoiceProviderAdapterMetadata {
    return {
      adapterKind: LOCAL_ADAPTER_KIND,
      providerKind: "local",
      audioApisCalled: false,
      microphoneApisCalled: false,
      sttApisCalled: false,
      ttsApisCalled: false,
      providerApisCalled: false,
      heavyModelsLoaded: false,
      storageWritesEnabled: false,
      systemApisCalled: false,
      requiresExplicitOptIn: true,
    };
  }

  getSnapshot(): LucaVoiceProviderAdapterSnapshot {
    return {
      adapterKind: LOCAL_ADAPTER_KIND,
      providerKind: "local",
      registeredBackends: Array.from(this.registeredBackends),
      metadata: this.getMetadata(),
    };
  }

  reset(): void {
    this.registeredBackends.clear();
  }
}
