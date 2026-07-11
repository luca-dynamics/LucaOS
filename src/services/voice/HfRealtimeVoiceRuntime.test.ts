import { describe, expect, it, vi } from "vitest";
import { createRealtimeVoiceSessionController } from "./createRealtimeVoiceSessionController";
import {
  HfRealtimeVoiceRuntime,
  type HfRealtimeWebSocketLike,
} from "./HfRealtimeVoiceRuntime";

class FakeWebSocket implements HfRealtimeWebSocketLike {
  readyState = 0;
  binaryType: BinaryType = "blob";
  sent: string[] = [];
  private listeners = new Map<string, Array<(event?: unknown) => void>>();

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.sent.push(String(data));
  }

  close(): void {
    this.readyState = 3;
    this.emit("close", { code: 1000 });
  }

  addEventListener(type: "open" | "message" | "error" | "close", listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener as (event?: unknown) => void);
    this.listeners.set(type, listeners);
  }

  open(): void {
    this.readyState = 1;
    this.emit("open");
  }

  message(event: Record<string, unknown>): void {
    this.emit("message", { data: JSON.stringify(event) });
  }

  private emit(type: string, event?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function createHarness() {
  const socket = new FakeWebSocket();
  const controller = createRealtimeVoiceSessionController().controller;
  const appendPcm16 = vi.fn();
  const interrupt = vi.fn();
  const complete = vi.fn();
  const onToolCall = vi.fn();
  const runtime = new HfRealtimeVoiceRuntime({
    url: "ws://127.0.0.1:8765/v1/realtime",
    enabled: true,
    webSocketFactory: () => socket,
    controller,
    audioSink: { appendPcm16, interrupt, complete },
    onToolCall,
    session: { instructions: "Be concise", modalities: ["audio", "text"] },
  });
  return { socket, controller, runtime, appendPcm16, interrupt, complete, onToolCall };
}

describe("HfRealtimeVoiceRuntime", () => {
  it("requires explicit enablement", async () => {
    const runtime = new HfRealtimeVoiceRuntime({ url: "ws://localhost", enabled: false });
    await expect(runtime.connect()).rejects.toThrow("disabled");
  });

  it("opens a realtime session and streams input audio", async () => {
    const { socket, runtime } = createHarness();
    const connected = runtime.connect();
    socket.open();
    await connected;

    runtime.appendInputAudio("AAAA");
    const sent = socket.sent.map((item) => JSON.parse(item));
    expect(sent[0]).toMatchObject({ type: "session.update" });
    expect(sent[1]).toEqual({ type: "input_audio_buffer.append", audio: "AAAA" });
    expect(runtime.getSnapshot()).toMatchObject({
      status: "connected",
      connected: true,
      counters: { sentAudioChunks: 1 },
      metadata: { websocketOpened: true, providerApisCalled: true },
    });
  });

  it("maps transcript, audio, completion, and tool events into Luca runtime state", async () => {
    const { socket, runtime, controller, appendPcm16, complete, onToolCall } = createHarness();
    const connected = runtime.connect();
    socket.open();
    await connected;

    socket.message({ type: "input_audio_buffer.speech_started" });
    socket.message({ type: "conversation.item.input_audio_transcription.delta", delta: "hel" });
    socket.message({ type: "conversation.item.input_audio_transcription.completed", transcript: "hello" });
    socket.message({ type: "response.created", response: { id: "resp-1" } });
    socket.message({ type: "response.output_audio_transcript.delta", delta: "Hi" });
    socket.message({ type: "response.output_audio.delta", delta: "BBBB" });
    socket.message({
      type: "response.function_call_arguments.done",
      call_id: "call-1",
      name: "search",
      arguments: "{\"q\":\"Luca\"}",
    });
    await Promise.resolve();
    socket.message({ type: "response.done", response: { id: "resp-1", status: "completed" } });
    await Promise.resolve();

    expect(appendPcm16).toHaveBeenCalledWith("BBBB");
    expect(onToolCall).toHaveBeenCalledWith({
      callId: "call-1",
      name: "search",
      arguments: "{\"q\":\"Luca\"}",
    });
    expect(complete).toHaveBeenCalled();
    expect(controller.getState().status).toBe("idle");
    expect(runtime.getSnapshot().counters).toMatchObject({
      receivedAudioChunks: 1,
      partialTranscripts: 1,
      finalTranscripts: 1,
      toolCalls: 1,
    });
  });

  it("sends text, image, tool results, and cancellation in protocol form", async () => {
    const { socket, runtime, interrupt } = createHarness();
    const connected = runtime.connect();
    socket.open();
    await connected;

    runtime.sendText("hello", false);
    runtime.sendImage("data:image/jpeg;base64,AAAA", false);
    runtime.sendToolResult("call-1", { ok: true }, false);
    runtime.cancelResponse();

    const sent = socket.sent.slice(1).map((item) => JSON.parse(item));
    expect(sent[0].item.content[0]).toEqual({ type: "input_text", text: "hello" });
    expect(sent[1].item.content[0]).toEqual({
      type: "input_image",
      image_url: "data:image/jpeg;base64,AAAA",
    });
    expect(sent[2].item).toMatchObject({ type: "function_call_output", call_id: "call-1" });
    expect(sent[3]).toEqual({ type: "response.cancel" });
    expect(interrupt).toHaveBeenCalled();
  });
});
