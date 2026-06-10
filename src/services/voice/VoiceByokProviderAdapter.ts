import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import {
  LucaSTTBackend,
  LucaTTSBackend,
  LucaVoiceProviderAdapterMetadata,
  LucaVoiceProviderAdapterSnapshot,
} from "./types";

const BYOK_ADAPTER_KIND = "byok_adapter" as const;

export interface VoiceByokProviderAdapterOptions {
  providerLabels?: string[];
}

export class VoiceByokProviderAdapter {
  private readonly registeredBackends = new Set<string>();
  private readonly providerLabels: string[];

  constructor(options?: VoiceByokProviderAdapterOptions) {
    this.providerLabels = options?.providerLabels ?? [];
  }

  registerBackends(registry: VoiceBackendRegistry): string[] {
    const labelSuffix = this.providerLabels.length > 0 ? ` (${this.providerLabels.join(", ")})` : "";

    const sttBackend: LucaSTTBackend = {
      id: "voice.byok.stub.stt",
      label: `BYOK STT Scaffold${labelSuffix}`,
      providerKind: "byok",
      supportsStreaming: true,
      supportedLanguages: ["en", "auto"],
      transcribe: async () => ({
        transcript: "",
        language: "en",
        confidence: 0,
        isFinal: true,
      }),
      getSnapshot: () => ({
        id: "voice.byok.stub.stt",
        label: `BYOK STT Scaffold${labelSuffix}`,
        providerKind: "byok",
        supportsStreaming: true,
        supportedLanguages: ["en", "auto"],
      }),
    };

    const ttsBackend: LucaTTSBackend = {
      id: "voice.byok.stub.tts",
      label: `BYOK TTS Scaffold${labelSuffix}`,
      providerKind: "byok",
      supportsStreaming: true,
      supportsVoiceClone: false,
      supportsEmotion: false,
      supportedLanguages: ["en", "auto"],
      synthesize: async (input) => ({
        outputEvent: {
          id: `voice.byok.output.${input.sessionId}`,
          sessionId: input.sessionId,
          kind: "tts_completed",
          text: input.text,
          voiceId: input.voiceId,
          language: input.language ?? "en",
          isFinal: true,
          metadata: { scaffold: true, providerKind: "byok", providerLabels: this.providerLabels },
        },
      }),
      getSnapshot: () => ({
        id: "voice.byok.stub.tts",
        label: `BYOK TTS Scaffold${labelSuffix}`,
        providerKind: "byok",
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
      adapterKind: BYOK_ADAPTER_KIND,
      providerKind: "byok",
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
      adapterKind: BYOK_ADAPTER_KIND,
      providerKind: "byok",
      registeredBackends: Array.from(this.registeredBackends),
      metadata: this.getMetadata(),
    };
  }

  reset(): void {
    this.registeredBackends.clear();
  }
}
