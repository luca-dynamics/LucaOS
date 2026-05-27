import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import {
  LucaVoiceProviderPreference,
  LucaVoiceStreamChunk,
  LucaVoiceStreamKind,
  LucaVoiceStreamingRuntimeMetadata,
  LucaVoiceStreamingSession,
} from "./types";

const runtimeMetadata: LucaVoiceStreamingRuntimeMetadata = {
  runtimeKind: "voice_streaming_scaffold",
  audioApisCalled: false,
  microphoneApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  websocketOpened: false,
  heavyModelsLoaded: false,
  systemApisCalled: false,
  requiresExplicitOptIn: true,
};

export interface VoiceStreamingOpenStreamRequest {
  kind: LucaVoiceStreamKind;
  providerPreference?: LucaVoiceProviderPreference;
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceStreamingSnapshot {
  metadata: LucaVoiceStreamingRuntimeMetadata;
  totalSessions: number;
  sessions: LucaVoiceStreamingSession[];
  chunks: LucaVoiceStreamChunk[];
}

export class VoiceStreamingRuntime {
  private readonly sessions = new Map<string, LucaVoiceStreamingSession>();
  private readonly chunks = new Map<string, LucaVoiceStreamChunk[]>();

  constructor(
    private readonly router?: VoiceProviderRouter,
    private readonly bridge?: VoiceRuntimeEventBridge,
  ) {}

  openStream(request: VoiceStreamingOpenStreamRequest): LucaVoiceStreamingSession {
    const now = new Date().toISOString();
    const streamId = `voice-stream-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const selectedBackendId = this.router
      ?.route({
        capability: request.kind === "stt" ? "streaming_stt" : "streaming_tts",
        preference: request.providerPreference,
        language: request.language,
        requiresStreaming: true,
        metadata: { streamId },
      })
      .selectedBackendId;

    const session: LucaVoiceStreamingSession = {
      streamId,
      kind: request.kind,
      status: "streaming",
      providerPreference: request.providerPreference,
      selectedBackendId,
      language: request.language,
      startedAt: now,
      metadata: { ...(request.metadata ?? {}) },
    };

    this.sessions.set(streamId, session);
    this.chunks.set(streamId, []);
    this.safeRecord(() =>
      this.bridge?.recordCommandResult(
        {
          status: "handled",
          textResponse: `voice_stream_opened:${request.kind}`,
          spokenResponse: `voice_stream_opened:${request.kind}`,
          metadata: { ...runtimeMetadata, streamId, streamKind: request.kind },
        },
        { sessionId: streamId, source: "voice_stream_open" },
      ),
    );

    return { ...session, metadata: { ...session.metadata } };
  }

  pushChunk(chunk: Omit<LucaVoiceStreamChunk, "sequence" | "timestamp">): LucaVoiceStreamChunk | undefined {
    const session = this.sessions.get(chunk.streamId);
    if (!session || session.status === "completed" || session.status === "interrupted" || session.status === "failed") {
      return undefined;
    }

    const streamChunks = this.chunks.get(chunk.streamId) ?? [];
    const next: LucaVoiceStreamChunk = {
      ...chunk,
      sequence: streamChunks.length + 1,
      timestamp: new Date().toISOString(),
      metadata: { ...(chunk.metadata ?? {}) },
    };
    streamChunks.push(next);
    this.chunks.set(chunk.streamId, streamChunks);

    if (next.isFinal) {
      this.completeStream(chunk.streamId);
    }

    return { ...next, metadata: { ...(next.metadata ?? {}) } };
  }

  pauseStream(streamId: string): LucaVoiceStreamingSession | undefined {
    return this.updateStatus(streamId, "paused");
  }

  completeStream(streamId: string): LucaVoiceStreamingSession | undefined {
    const updated = this.updateStatus(streamId, "completed", { completedAt: new Date().toISOString() });
    if (updated) {
      this.safeRecord(() =>
        this.bridge?.recordOutputEvent(
          { kind: "tts_completed", text: `voice_stream_completed:${updated.kind}`, metadata: { streamId } },
          { sessionId: streamId },
        ),
      );
    }
    return updated;
  }

  interruptStream(streamId: string): LucaVoiceStreamingSession | undefined {
    const updated = this.updateStatus(streamId, "interrupted", { completedAt: new Date().toISOString() });
    if (updated) {
      this.safeRecord(() =>
        this.bridge?.recordOutputEvent(
          { kind: "tts_interrupted", text: `voice_stream_interrupted:${updated.kind}`, metadata: { streamId } },
          { sessionId: streamId },
        ),
      );
    }
    return updated;
  }

  failStream(streamId: string, reason: string): LucaVoiceStreamingSession | undefined {
    const updated = this.updateStatus(streamId, "failed", {
      completedAt: new Date().toISOString(),
      metadata: { reason },
    });

    if (updated) {
      this.safeRecord(() =>
        this.bridge?.recordCommandResult(
          {
            status: "failed",
            textResponse: reason,
            spokenResponse: reason,
            metadata: { ...runtimeMetadata, streamId, streamKind: updated.kind },
          },
          { sessionId: streamId, source: "voice_stream_fail" },
        ),
      );
    }

    return updated;
  }

  getSnapshot(streamId?: string): VoiceStreamingSnapshot {
    const sessions = streamId
      ? [this.sessions.get(streamId)].filter((session): session is LucaVoiceStreamingSession => Boolean(session))
      : Array.from(this.sessions.values());

    const chunks = streamId
      ? [...(this.chunks.get(streamId) ?? [])]
      : Array.from(this.chunks.values()).flatMap((items) => items);

    return {
      metadata: { ...runtimeMetadata },
      totalSessions: sessions.length,
      sessions: sessions.map((session) => ({ ...session, metadata: { ...session.metadata } })),
      chunks: chunks.map((item) => ({ ...item, metadata: { ...(item.metadata ?? {}) } })),
    };
  }

  reset(): void {
    this.sessions.clear();
    this.chunks.clear();
  }

  private updateStatus(
    streamId: string,
    status: LucaVoiceStreamingSession["status"],
    extras?: { completedAt?: string; metadata?: Record<string, unknown> },
  ): LucaVoiceStreamingSession | undefined {
    const current = this.sessions.get(streamId);
    if (!current) return undefined;

    const next: LucaVoiceStreamingSession = {
      ...current,
      status,
      completedAt: extras?.completedAt ?? current.completedAt,
      metadata: { ...current.metadata, ...(extras?.metadata ?? {}) },
    };

    this.sessions.set(streamId, next);
    return { ...next, metadata: { ...next.metadata } };
  }

  private safeRecord(recorder: () => unknown): void {
    try {
      recorder();
    } catch {
      // non-fatal in scaffold mode
    }
  }
}
