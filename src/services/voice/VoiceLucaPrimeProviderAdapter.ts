import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import {
  LucaSTTBackend,
  LucaTTSBackend,
  LucaVoiceProviderAdapterMetadata,
  LucaVoiceProviderAdapterSnapshot,
} from "./types";

const LUCA_PRIME_ADAPTER_KIND = "luca_prime_cloud_adapter" as const;

export class VoiceLucaPrimeProviderAdapter {
  private readonly registeredBackends = new Set<string>();

  registerBackends(registry: VoiceBackendRegistry): string[] {
    const sttBackend: LucaSTTBackend = {
      id: "voice.luca-prime.stub.stt",
      label: "Luca Prime Cloud STT Scaffold",
      providerKind: "cloud",
      supportsStreaming: true,
      supportedLanguages: ["en", "auto"],
      transcribe: async () => ({
        transcript: "",
        language: "en",
        confidence: 0,
        isFinal: true,
      }),
      getSnapshot: () => ({
        id: "voice.luca-prime.stub.stt",
        label: "Luca Prime Cloud STT Scaffold",
        providerKind: "cloud",
        supportsStreaming: true,
        supportedLanguages: ["en", "auto"],
      }),
    };

    const ttsBackend: LucaTTSBackend = {
      id: "voice.luca-prime.stub.tts",
      label: "Luca Prime Cloud TTS Scaffold",
      providerKind: "cloud",
      supportsStreaming: true,
      supportsVoiceClone: false,
      supportsEmotion: false,
      supportedLanguages: ["en", "auto"],
      synthesize: async (input) => ({
        outputEvent: {
          id: `voice.luca-prime.output.${input.sessionId}`,
          sessionId: input.sessionId,
          text: input.text,
          voiceId: input.voiceId,
          language: input.language ?? "en",
          isFinal: true,
          metadata: { scaffold: true, lane: "luca_prime_cloud" },
        },
      }),
      getSnapshot: () => ({
        id: "voice.luca-prime.stub.tts",
        label: "Luca Prime Cloud TTS Scaffold",
        providerKind: "cloud",
        supportsStreaming: true,
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
      adapterKind: LUCA_PRIME_ADAPTER_KIND,
      providerKind: "cloud",
      audioApisCalled: false,
      microphoneApisCalled: false,
      sttApisCalled: false,
      ttsApisCalled: false,
      providerApisCalled: false,
      heavyModelsLoaded: false,
      systemApisCalled: false,
      requiresExplicitOptIn: true,
    };
  }

  getSnapshot(): LucaVoiceProviderAdapterSnapshot {
    return {
      adapterKind: LUCA_PRIME_ADAPTER_KIND,
      providerKind: "cloud",
      registeredBackends: Array.from(this.registeredBackends),
      metadata: this.getMetadata(),
    };
  }

  reset(): void {
    this.registeredBackends.clear();
  }
}
