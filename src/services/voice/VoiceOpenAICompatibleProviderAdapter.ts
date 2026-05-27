import {
  type LucaVoiceAudioSpeechRequest,
  type LucaVoiceAudioTranscriptionRequest,
  type LucaVoiceOpenAICompatibleProviderOptions,
  type LucaVoiceOpenAICompatibleProviderSnapshot,
  type LucaVoiceProviderTransportRequest,
} from "./types";

export interface VoiceOpenAICompatibleProviderInvocationResult {
  ok: boolean;
  status: "ok" | "invocation_disabled" | "blocked";
  requestId: string;
  reason?: string;
  response?: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export class VoiceOpenAICompatibleProviderAdapter {
  private requestCounter = 0;
  private counters: LucaVoiceOpenAICompatibleProviderSnapshot["counters"] = {
    speechRequests: 0,
    transcriptionRequests: 0,
    voiceListRequests: 0,
    transportCalls: 0,
    blockedInvocations: 0,
  };

  constructor(private readonly options: LucaVoiceOpenAICompatibleProviderOptions = {}) {}

  async createSpeech(request: LucaVoiceAudioSpeechRequest): Promise<VoiceOpenAICompatibleProviderInvocationResult> {
    this.counters.speechRequests += 1;
    const requestId = this.nextRequestId("speech");
    const mapped = this.mapSpeechRequest(requestId, request);
    return this.invokeMappedRequest(requestId, mapped);
  }

  async createTranscription(request: LucaVoiceAudioTranscriptionRequest): Promise<VoiceOpenAICompatibleProviderInvocationResult> {
    this.counters.transcriptionRequests += 1;
    const requestId = this.nextRequestId("transcription");
    const mapped = this.mapTranscriptionRequest(requestId, request);
    return this.invokeMappedRequest(requestId, mapped);
  }

  async listVoices(): Promise<{ ok: boolean; voices: Array<Record<string, unknown>>; metadata: Record<string, unknown> }> {
    this.counters.voiceListRequests += 1;
    return {
      ok: true,
      voices: [
        { id: "alloy", name: "Alloy", provider: "openai_compatible_scaffold" },
        { id: "verse", name: "Verse", provider: "openai_compatible_scaffold" },
      ],
      metadata: {
        ...this.baseMetadata(),
        reason: "scaffold_voice_list",
      },
    };
  }

  getSnapshot(): LucaVoiceOpenAICompatibleProviderSnapshot {
    return {
      providerKind: "cloud",
      adapterKind: "openai_compatible_voice_provider",
      counters: { ...this.counters },
      metadata: this.baseMetadata(),
    };
  }

  reset(): void {
    this.requestCounter = 0;
    this.counters = {
      speechRequests: 0,
      transcriptionRequests: 0,
      voiceListRequests: 0,
      transportCalls: 0,
      blockedInvocations: 0,
    };
  }

  private async invokeMappedRequest(
    requestId: string,
    transportRequest: LucaVoiceProviderTransportRequest,
  ): Promise<VoiceOpenAICompatibleProviderInvocationResult> {
    if (!this.options.enableNetworkProviderCalls) {
      this.counters.blockedInvocations += 1;
      return {
        ok: false,
        status: "invocation_disabled",
        requestId,
        reason: "network_provider_calls_disabled",
        metadata: { ...this.baseMetadata(), request: transportRequest },
      };
    }

    if (!this.options.transport) {
      this.counters.blockedInvocations += 1;
      return {
        ok: false,
        status: "blocked",
        requestId,
        reason: "missing_provider_transport",
        metadata: { ...this.baseMetadata(), request: transportRequest },
      };
    }

    const canUseMockWithoutApiKey = this.options.transport.kind === "mock" && this.options.allowUnauthenticatedMock === true;
    if (!this.options.apiKey?.trim() && !canUseMockWithoutApiKey) {
      this.counters.blockedInvocations += 1;
      return {
        ok: false,
        status: "blocked",
        requestId,
        reason: "missing_api_key",
        metadata: { ...this.baseMetadata(), request: transportRequest },
      };
    }

    this.counters.transportCalls += 1;
    const result = await this.options.transport.send(transportRequest);
    return {
      ok: result.ok,
      status: result.ok ? "ok" : "blocked",
      requestId,
      reason: result.ok ? undefined : (result.error ?? "provider_transport_error"),
      response: result.body,
      metadata: { ...this.baseMetadata(), request: transportRequest, transport: result.metadata, status: result.status },
    };
  }

  private mapSpeechRequest(requestId: string, request: LucaVoiceAudioSpeechRequest): LucaVoiceProviderTransportRequest {
    return {
      requestId,
      method: "POST",
      path: "/v1/audio/speech",
      headers: this.buildHeaders(),
      body: {
        model: request.model || this.options.defaultSpeechModel,
        input: request.input,
        voice: request.voice || this.options.defaultVoice,
        response_format: request.response_format,
        speed: request.speed,
      },
      metadata: request.metadata,
    };
  }

  private mapTranscriptionRequest(requestId: string, request: LucaVoiceAudioTranscriptionRequest): LucaVoiceProviderTransportRequest {
    return {
      requestId,
      method: "POST",
      path: "/v1/audio/transcriptions",
      headers: this.buildHeaders(),
      body: {
        model: request.model || this.options.defaultTranscriptionModel,
        file: request.filePlaceholder,
        language: request.language,
        prompt: request.prompt,
        response_format: request.response_format,
      },
      metadata: request.metadata,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;
    if (this.options.organizationId) headers["OpenAI-Organization"] = this.options.organizationId;
    if (this.options.projectId) headers["OpenAI-Project"] = this.options.projectId;
    return headers;
  }

  private baseMetadata(): LucaVoiceOpenAICompatibleProviderSnapshot["metadata"] {
    return {
      adapterKind: "openai_compatible_voice_provider",
      networkProviderCallsEnabled: this.options.enableNetworkProviderCalls === true,
      providerApisCalled: this.counters.transportCalls > 0,
      audioApisCalled: false,
      microphoneApisCalled: false,
      systemApisCalled: false,
      heavyModelsLoaded: false,
      requiresExplicitOptIn: true,
      ...(this.options.metadata ?? {}),
    };
  }

  private nextRequestId(prefix: "speech" | "transcription"): string {
    this.requestCounter += 1;
    return `voice-provider-${prefix}-${this.requestCounter}`;
  }
}
