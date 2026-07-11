import { RealtimeVoiceSessionController } from "./RealtimeVoiceSessionController";

export type HfRealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closing"
  | "closed"
  | "failed";

export interface HfRealtimeWebSocketLike {
  readyState: number;
  binaryType: BinaryType;
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  addEventListener(type: "error", listener: () => void): void;
  addEventListener(type: "close", listener: (event: CloseEvent) => void): void;
}

export type HfRealtimeWebSocketFactory = (
  url: string,
  protocols?: string | string[],
) => HfRealtimeWebSocketLike;

export interface HfRealtimeAudioSink {
  appendPcm16(base64Audio: string): void | Promise<void>;
  interrupt(): void | Promise<void>;
  complete?(): void | Promise<void>;
}

export interface HfRealtimeToolCall {
  callId: string;
  name: string;
  arguments: string;
}

export interface HfRealtimeVoiceRuntimeOptions {
  url: string;
  enabled: boolean;
  webSocketFactory?: HfRealtimeWebSocketFactory;
  controller?: RealtimeVoiceSessionController;
  audioSink?: HfRealtimeAudioSink;
  session?: Record<string, unknown>;
  protocols?: string | string[];
  onToolCall?: (call: HfRealtimeToolCall) => void | Promise<void>;
  onEvent?: (event: Record<string, unknown>) => void;
}

export interface HfRealtimeVoiceRuntimeSnapshot {
  status: HfRealtimeConnectionStatus;
  url: string;
  connected: boolean;
  sessionId?: string;
  responseId?: string;
  lastError?: string;
  counters: {
    sentAudioChunks: number;
    receivedAudioChunks: number;
    partialTranscripts: number;
    finalTranscripts: number;
    toolCalls: number;
    interruptions: number;
  };
  metadata: {
    runtimeKind: "hf_openai_realtime_voice";
    featureGated: true;
    networkApisCalled: boolean;
    websocketOpened: boolean;
    providerApisCalled: boolean;
    requiresExplicitOptIn: true;
  };
}

const WS_OPEN = 1;

export class HfRealtimeVoiceRuntime {
  private socket?: HfRealtimeWebSocketLike;
  private status: HfRealtimeConnectionStatus = "idle";
  private sessionId?: string;
  private responseId?: string;
  private lastError?: string;
  private websocketOpened = false;
  private providerApisCalled = false;
  private counters: HfRealtimeVoiceRuntimeSnapshot["counters"] = {
    sentAudioChunks: 0,
    receivedAudioChunks: 0,
    partialTranscripts: 0,
    finalTranscripts: 0,
    toolCalls: 0,
    interruptions: 0,
  };

  constructor(private readonly options: HfRealtimeVoiceRuntimeOptions) {}

  async connect(): Promise<void> {
    if (!this.options.enabled) {
      throw new Error("HF realtime voice runtime is disabled");
    }
    if (this.status === "connected") return;

    const factory = this.options.webSocketFactory ?? this.defaultWebSocketFactory;
    this.status = "connecting";
    this.lastError = undefined;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = factory(this.options.url, this.options.protocols);
      this.socket = socket;
      socket.binaryType = "arraybuffer";
      this.websocketOpened = true;
      this.providerApisCalled = true;

      socket.addEventListener("open", () => {
        this.status = "connected";
        this.options.controller?.startSession({ metadata: { transport: "hf_openai_realtime" } });
        this.sendEvent({ type: "session.update", session: this.options.session ?? {} });
        settled = true;
        resolve();
      });
      socket.addEventListener("message", (event) => {
        void this.handleMessage(event.data);
      });
      socket.addEventListener("error", () => {
        this.fail("HF realtime WebSocket error");
        if (!settled) {
          settled = true;
          reject(new Error(this.lastError));
        }
      });
      socket.addEventListener("close", () => {
        this.status = "closed";
        this.options.controller?.stopSession("transport_closed");
        if (!settled) {
          settled = true;
          reject(new Error("HF realtime WebSocket closed before connecting"));
        }
      });
    });
  }

  appendInputAudio(base64Pcm16: string): void {
    this.assertConnected();
    this.sendEvent({ type: "input_audio_buffer.append", audio: base64Pcm16 });
    this.counters.sentAudioChunks += 1;
  }

  sendText(text: string, createResponse = true): void {
    this.assertConnected();
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    if (createResponse) this.createResponse();
  }

  sendImage(dataUrl: string, createResponse = true): void {
    this.assertConnected();
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_image", image_url: dataUrl }],
      },
    });
    if (createResponse) this.createResponse();
  }

  sendToolResult(callId: string, output: unknown, createResponse = true): void {
    this.assertConnected();
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: typeof output === "string" ? output : JSON.stringify(output),
      },
    });
    if (createResponse) this.createResponse();
  }

  createResponse(response?: Record<string, unknown>): void {
    this.assertConnected();
    this.sendEvent({ type: "response.create", ...(response ? { response } : {}) });
  }

  cancelResponse(): void {
    if (!this.socket || this.socket.readyState !== WS_OPEN) return;
    this.sendEvent({ type: "response.cancel" });
    this.counters.interruptions += 1;
    this.options.controller?.interrupt("client_cancelled");
    void this.options.audioSink?.interrupt();
  }

  disconnect(): void {
    if (!this.socket) return;
    this.status = "closing";
    this.socket.close(1000, "client_disconnect");
    this.socket = undefined;
  }

  getSnapshot(): HfRealtimeVoiceRuntimeSnapshot {
    return {
      status: this.status,
      url: this.options.url,
      connected: this.status === "connected",
      sessionId: this.sessionId,
      responseId: this.responseId,
      lastError: this.lastError,
      counters: { ...this.counters },
      metadata: {
        runtimeKind: "hf_openai_realtime_voice",
        featureGated: true,
        networkApisCalled: this.providerApisCalled,
        websocketOpened: this.websocketOpened,
        providerApisCalled: this.providerApisCalled,
        requiresExplicitOptIn: true,
      },
    };
  }

  private sendEvent(event: Record<string, unknown>): void {
    this.assertConnected();
    this.socket!.send(JSON.stringify(event));
  }

  private async handleMessage(data: unknown): Promise<void> {
    const event = this.parseEvent(data);
    if (!event) return;
    this.options.onEvent?.(event);
    const type = String(event.type ?? "");

    if (type === "session.created" || type === "session.updated") {
      const session = event.session as Record<string, unknown> | undefined;
      this.sessionId = typeof session?.id === "string" ? session.id : this.sessionId;
      return;
    }
    if (type === "input_audio_buffer.speech_started") {
      this.options.controller?.startListening();
      if (this.options.controller?.getState().isSpeaking) {
        this.options.controller.detectBargeIn({ source: "server_vad" });
      }
      return;
    }
    if (type === "conversation.item.input_audio_transcription.delta") {
      const delta = String(event.delta ?? "");
      this.counters.partialTranscripts += 1;
      this.options.controller?.receivePartialTranscript(delta, { transport: "hf_openai_realtime" });
      return;
    }
    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcript = String(event.transcript ?? "");
      this.counters.finalTranscripts += 1;
      this.options.controller?.receiveFinalTranscript(transcript, { transport: "hf_openai_realtime" });
      return;
    }
    if (type === "response.created") {
      const response = event.response as Record<string, unknown> | undefined;
      this.responseId = typeof response?.id === "string" ? response.id : undefined;
      this.options.controller?.startThinking({ responseId: this.responseId });
      return;
    }
    if (type === "response.output_audio.delta" || type === "response.audio.delta") {
      const delta = String(event.delta ?? "");
      this.counters.receivedAudioChunks += 1;
      const state = this.options.controller?.getState();
      if (state && !state.isSpeaking) this.options.controller?.startSpeaking(state.currentResponse ?? "");
      await this.options.audioSink?.appendPcm16(delta);
      return;
    }
    if (type === "response.output_audio_transcript.delta" || type === "response.audio_transcript.delta") {
      const delta = String(event.delta ?? "");
      const current = this.options.controller?.getState().currentResponse ?? "";
      this.options.controller?.startSpeaking(`${current}${delta}`);
      return;
    }
    if (type === "response.function_call_arguments.done") {
      this.counters.toolCalls += 1;
      await this.options.onToolCall?.({
        callId: String(event.call_id ?? ""),
        name: String(event.name ?? ""),
        arguments: String(event.arguments ?? "{}"),
      });
      return;
    }
    if (type === "response.done") {
      const response = event.response as Record<string, unknown> | undefined;
      const status = String(response?.status ?? "completed");
      if (status === "cancelled") {
        this.counters.interruptions += 1;
        this.options.controller?.interrupt("server_cancelled");
        await this.options.audioSink?.interrupt();
      } else {
        this.options.controller?.completeSpeaking({ responseId: this.responseId });
        await this.options.audioSink?.complete?.();
      }
      this.responseId = undefined;
      return;
    }
    if (type === "error") {
      const error = event.error as Record<string, unknown> | undefined;
      this.fail(String(error?.message ?? "HF realtime provider error"));
    }
  }

  private parseEvent(data: unknown): Record<string, unknown> | undefined {
    if (typeof data === "string") {
      try {
        return JSON.parse(data) as Record<string, unknown>;
      } catch {
        this.fail("HF realtime provider sent invalid JSON");
      }
    }
    return undefined;
  }

  private fail(message: string): void {
    this.status = "failed";
    this.lastError = message;
    this.options.controller?.failSession(message);
  }

  private assertConnected(): void {
    if (!this.socket || this.socket.readyState !== WS_OPEN || this.status !== "connected") {
      throw new Error("HF realtime voice runtime is not connected");
    }
  }

  private defaultWebSocketFactory: HfRealtimeWebSocketFactory = (url, protocols) => {
    if (typeof WebSocket === "undefined") {
      throw new Error("WebSocket is unavailable in this runtime");
    }
    return new WebSocket(url, protocols) as HfRealtimeWebSocketLike;
  };
}
