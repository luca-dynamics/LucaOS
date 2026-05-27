import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import {
  LucaVoiceAudioApiMetadata,
  LucaVoiceAudioSpeechRequest,
  LucaVoiceAudioSpeechResult,
  LucaVoiceAudioTranscriptionRequest,
  LucaVoiceAudioTranscriptionResult,
  LucaVoiceAudioVoiceListResult,
} from "./types";

const AUDIO_API_METADATA: LucaVoiceAudioApiMetadata = {
  apiKind: "openai_compatible_audio_scaffold",
  httpServerStarted: false,
  audioApisCalled: false,
  microphoneApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  providerApisCalled: false,
  heavyModelsLoaded: false,
  systemApisCalled: false,
  requiresExplicitOptIn: true,
};

export interface VoiceOpenAICompatibleAudioApiSnapshot {
  kind: "voice_openai_compatible_audio_scaffold";
  speechRequests: number;
  transcriptionRequests: number;
  voiceListRequests: number;
  lastSpeechResult?: LucaVoiceAudioSpeechResult;
  lastTranscriptionResult?: LucaVoiceAudioTranscriptionResult;
  lastVoiceListResult?: LucaVoiceAudioVoiceListResult;
  metadata: LucaVoiceAudioApiMetadata;
}

export class VoiceOpenAICompatibleAudioApi {
  private speechRequests = 0;
  private transcriptionRequests = 0;
  private voiceListRequests = 0;
  private requestCounter = 0;
  private lastSpeechResult?: LucaVoiceAudioSpeechResult;
  private lastTranscriptionResult?: LucaVoiceAudioTranscriptionResult;
  private lastVoiceListResult?: LucaVoiceAudioVoiceListResult;

  constructor(
    private readonly router?: VoiceProviderRouter,
    private readonly registry?: VoiceBackendRegistry,
  ) {}

  createSpeech(request: LucaVoiceAudioSpeechRequest): LucaVoiceAudioSpeechResult {
    this.speechRequests += 1;
    const requestId = this.nextRequestId("speech");

    if (!request.model?.trim() || !request.input?.trim()) {
      return this.finishSpeech({
        ok: false,
        requestId,
        reason: "missing_model_or_input",
        metadata: AUDIO_API_METADATA,
      });
    }

    const route = this.router?.route({
      capability: "tts",
      preference: request.providerPreference,
      language: request.language,
      metadata: request.metadata,
    });

    return this.finishSpeech({
      ok: true,
      requestId,
      selectedBackendId: route?.selectedBackendId,
      selectedProviderKind: route?.selectedProviderKind,
      audioPlaceholder: `audio_placeholder:${requestId}`,
      metadata: AUDIO_API_METADATA,
    });
  }

  createTranscription(request: LucaVoiceAudioTranscriptionRequest): LucaVoiceAudioTranscriptionResult {
    this.transcriptionRequests += 1;
    const requestId = this.nextRequestId("transcription");

    if (!request.filePlaceholder?.trim()) {
      return this.finishTranscription({
        ok: false,
        requestId,
        reason: "missing_file_placeholder",
        metadata: AUDIO_API_METADATA,
      });
    }

    const route = this.router?.route({
      capability: "stt",
      preference: request.providerPreference,
      language: request.language,
      metadata: request.metadata,
    });

    return this.finishTranscription({
      ok: true,
      requestId,
      selectedBackendId: route?.selectedBackendId,
      selectedProviderKind: route?.selectedProviderKind,
      text: `transcription_placeholder:${requestId}`,
      segments: [],
      metadata: AUDIO_API_METADATA,
    });
  }

  listVoices(): LucaVoiceAudioVoiceListResult {
    this.voiceListRequests += 1;
    const registered = this.registry?.listTTSBackends() ?? [];
    const voices = registered.length > 0
      ? registered.map((backend) => ({
          id: backend.id,
          name: backend.label,
          providerKind: backend.providerKind,
          supportsStreaming: backend.supportsStreaming,
          supportsVoiceClone: backend.supportsVoiceClone,
          supportsEmotion: backend.supportsEmotion,
          supportedLanguages: backend.supportedLanguages,
        }))
      : [{ id: "scaffold-default", name: "Scaffold Default Voice", providerKind: "local", supportedLanguages: ["en"] }];

    const result: LucaVoiceAudioVoiceListResult = { ok: true, voices, metadata: AUDIO_API_METADATA };
    this.lastVoiceListResult = result;
    return result;
  }

  getSnapshot(): VoiceOpenAICompatibleAudioApiSnapshot {
    return {
      kind: "voice_openai_compatible_audio_scaffold",
      speechRequests: this.speechRequests,
      transcriptionRequests: this.transcriptionRequests,
      voiceListRequests: this.voiceListRequests,
      lastSpeechResult: this.lastSpeechResult,
      lastTranscriptionResult: this.lastTranscriptionResult,
      lastVoiceListResult: this.lastVoiceListResult,
      metadata: AUDIO_API_METADATA,
    };
  }

  reset(): void {
    this.speechRequests = 0;
    this.transcriptionRequests = 0;
    this.voiceListRequests = 0;
    this.requestCounter = 0;
    this.lastSpeechResult = undefined;
    this.lastTranscriptionResult = undefined;
    this.lastVoiceListResult = undefined;
  }

  private finishSpeech(result: LucaVoiceAudioSpeechResult): LucaVoiceAudioSpeechResult {
    this.lastSpeechResult = result;
    return result;
  }

  private finishTranscription(result: LucaVoiceAudioTranscriptionResult): LucaVoiceAudioTranscriptionResult {
    this.lastTranscriptionResult = result;
    return result;
  }

  private nextRequestId(prefix: "speech" | "transcription"): string {
    this.requestCounter += 1;
    return `voice-audio-${prefix}-${this.requestCounter}`;
  }
}
