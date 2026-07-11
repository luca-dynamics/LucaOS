import type { HybridVoiceConfig } from "../hybridVoiceService";
import type { VoiceSessionRoute } from "../voiceSessionRouter";
import { HfRealtimeVoiceRuntime } from "./HfRealtimeVoiceRuntime";
import { canonicalVoiceSessionBus } from "./CanonicalVoiceSessionBus";

export interface BrowserHfRealtimeVoiceConfig extends Partial<HybridVoiceConfig> {
  endpoint: string;
  enabled: boolean;
  onToolCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  inputSampleRate?: number;
  outputSampleRate?: number;
}

const floatToPcm16Base64 = (samples: Float32Array): string => {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
};

const pcm16Base64ToFloat = (base64: string): Float32Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(Math.floor(bytes.length / 2));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 0x8000;
  }
  return samples;
};

export class BrowserHfRealtimeVoiceSession {
  private runtime?: HfRealtimeVoiceRuntime;
  private config?: BrowserHfRealtimeVoiceConfig;
  private inputContext?: AudioContext;
  private outputContext?: AudioContext;
  private micStream?: MediaStream;
  private micSource?: MediaStreamAudioSourceNode;
  private processor?: ScriptProcessorNode;
  private outputSources = new Set<AudioBufferSourceNode>();
  private nextPlaybackAt = 0;
  private isConnected = false;
  private currentStatus = "IDLE";

  get connected(): boolean { return this.isConnected; }
  get status(): string { return this.currentStatus; }
  get routeKind(): VoiceSessionRoute["kind"] { return "LOCAL_PIPELINE"; }
  get canBargeIn(): boolean { return true; }
  get supportsAudioOutput(): boolean { return true; }

  async connect(config: BrowserHfRealtimeVoiceConfig): Promise<void> {
    if (this.isConnected) return;
    this.config = config;
    this.setStatus("CONNECTING");

    const inputRate = config.inputSampleRate ?? 24000;
    const outputRate = config.outputSampleRate ?? 24000;
    const controller = canonicalVoiceSessionBus.controller;
    controller.subscribe((state) => {
      this.setStatus(state.status.toUpperCase());
      config.onVadChange?.(state.isListening);
    });

    this.outputContext = new AudioContext({ sampleRate: outputRate });
    this.runtime = new HfRealtimeVoiceRuntime({
      url: config.endpoint,
      enabled: config.enabled,
      controller,
      session: {
        modalities: ["text", "audio"],
        instructions: config.systemPrompt,
        input_audio_format: { type: "audio/pcm", rate: inputRate },
        output_audio_format: { type: "audio/pcm", rate: outputRate },
        input_audio_transcription: { model: config.sttModel || "parakeet-tdt" },
        turn_detection: { type: "server_vad", create_response: true, interrupt_response: true },
      },
      audioSink: {
        appendPcm16: (audio) => this.playPcm16(audio, outputRate),
        interrupt: () => this.interruptPlayback(),
      },
      onToolCall: async (call) => {
        canonicalVoiceSessionBus.publish({
          type: "tool.requested",
          route: "local_realtime",
          name: call.name,
          callId: call.callId,
        });
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.arguments) as Record<string, unknown>; } catch { args = {}; }
        const output = config.onToolCall
          ? await config.onToolCall(call.name, args)
          : { error: `Tool ${call.name} is unavailable` };
        canonicalVoiceSessionBus.publish({
          type: "tool.completed",
          route: "local_realtime",
          name: call.name,
          callId: call.callId,
        });
        this.runtime?.sendToolResult(call.callId, output);
      },
      onEvent: (event) => this.handleProtocolEvent(event),
    });

    try {
      await this.runtime.connect();
      await this.startMicrophone(inputRate);
      this.isConnected = true;
      this.setStatus("LISTENING");
      config.onConnectionChange?.(true);
    } catch (error) {
      await this.disconnect();
      this.setStatus("ERROR");
      throw error;
    }
  }

  sendText(text: string): void {
    this.runtime?.sendText(text);
  }

  sendImage(frame: string, createResponse = true): boolean {
    if (!this.runtime?.getSnapshot().connected) return false;
    this.runtime.sendImage(frame.startsWith("data:") ? frame : `data:image/jpeg;base64,${frame}`, createResponse);
    return true;
  }

  async disconnect(): Promise<void> {
    this.processor?.disconnect();
    this.micSource?.disconnect();
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.processor = undefined;
    this.micSource = undefined;
    this.micStream = undefined;
    this.interruptPlayback();
    this.runtime?.disconnect();
    this.runtime = undefined;
    await this.inputContext?.close().catch(() => undefined);
    await this.outputContext?.close().catch(() => undefined);
    this.inputContext = undefined;
    this.outputContext = undefined;
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.setStatus("IDLE");
    if (wasConnected) this.config?.onConnectionChange?.(false);
  }

  getSnapshot() {
    return this.runtime?.getSnapshot() ?? {
      status: this.currentStatus.toLowerCase(),
      connected: false,
      url: this.config?.endpoint,
    };
  }

  private async startMicrophone(sampleRate: number): Promise<void> {
    this.inputContext = new AudioContext({ sampleRate });
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.micSource = this.inputContext.createMediaStreamSource(this.micStream);
    this.processor = this.inputContext.createScriptProcessor(2048, 1, 1);
    this.processor.onaudioprocess = (event) => {
      if (!this.runtime?.getSnapshot().connected) return;
      const samples = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      this.config?.onAudioData?.(Math.min(1, Math.sqrt(sum / samples.length) * 4));
      this.runtime.appendInputAudio(floatToPcm16Base64(samples));
    };
    this.micSource.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }

  private playPcm16(base64: string, sampleRate: number): void {
    if (!this.outputContext) return;
    const samples = pcm16Base64ToFloat(base64);
    const buffer = this.outputContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = this.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputContext.destination);
    const startAt = Math.max(this.outputContext.currentTime + 0.01, this.nextPlaybackAt);
    source.start(startAt);
    this.nextPlaybackAt = startAt + buffer.duration;
    this.outputSources.add(source);
    source.onended = () => this.outputSources.delete(source);
  }

  private interruptPlayback(): void {
    for (const source of this.outputSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.outputSources.clear();
    this.nextPlaybackAt = this.outputContext?.currentTime ?? 0;
  }

  private handleProtocolEvent(event: Record<string, unknown>): void {
    const type = String(event.type ?? "");
    if (type === "conversation.item.input_audio_transcription.delta") {
      this.config?.onTranscript?.(String(event.delta ?? ""), "user");
    } else if (type === "conversation.item.input_audio_transcription.completed") {
      this.config?.onTranscript?.(String(event.transcript ?? ""), "user");
    } else if (type === "response.output_audio_transcript.delta" || type === "response.audio_transcript.delta") {
      this.config?.onTranscript?.(String(event.delta ?? ""), "model");
    }
  }

  private setStatus(status: string): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    this.config?.onStatusUpdate?.(status);
  }
}

export const browserHfRealtimeVoiceSession = new BrowserHfRealtimeVoiceSession();
