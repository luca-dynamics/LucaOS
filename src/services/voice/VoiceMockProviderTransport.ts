import {
  type LucaVoiceProviderTransport,
  type LucaVoiceProviderTransportRequest,
  type LucaVoiceProviderTransportResult,
} from "./types";

export interface VoiceMockProviderTransportSnapshot extends Record<string, unknown> {
  kind: "mock";
  requestCount: number;
  requests: LucaVoiceProviderTransportRequest[];
  queuedResultCount: number;
}

export class VoiceMockProviderTransport implements LucaVoiceProviderTransport {
  readonly kind = "mock" as const;

  private requests: LucaVoiceProviderTransportRequest[] = [];
  private queuedResults: LucaVoiceProviderTransportResult[] = [];
  private defaultResult: LucaVoiceProviderTransportResult = {
    ok: true,
    status: 200,
    body: { mocked: true },
    metadata: { transportKind: "mock", mocked: true },
  };

  queueResult(result: LucaVoiceProviderTransportResult): void {
    this.queuedResults.push(result);
  }

  setDefaultResult(result: LucaVoiceProviderTransportResult): void {
    this.defaultResult = result;
  }

  async send(request: LucaVoiceProviderTransportRequest): Promise<LucaVoiceProviderTransportResult> {
    this.requests.push(request);
    const next = this.queuedResults.shift();
    return next ?? this.defaultResult;
  }

  getSnapshot(): VoiceMockProviderTransportSnapshot {
    return {
      kind: "mock",
      requestCount: this.requests.length,
      requests: [...this.requests],
      queuedResultCount: this.queuedResults.length,
    };
  }

  reset(): void {
    this.requests = [];
    this.queuedResults = [];
  }
}
