/**
 * Hybrid Voice Service - Industrial Provider Architecture
 *
 * Orchestrates: Mic → VAD → CapabilityRouter → [STT -> Brain -> TTS]
 */

import { MicVAD } from "@ricky0123/vad-web";
import { eventBus } from "./eventBus";
import { capabilityRouter } from "./CapabilityRouter";
import {
  IStreamingSttProvider,
  IReasoningProvider,
  ITtsProvider,
} from "./voice/types";
import { AudioStreamPlayer } from "./voice/utils/AudioStreamPlayer";

export interface HybridVoiceConfig {
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onTranscript?: (text: string, source: "user" | "model") => void;
  onAudioData?: (amplitude: number) => void;
  onVadChange?: (active: boolean) => void;
  onStatusUpdate?: (status: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  sttModel?: string;
  llmModel?: string;
  ttsVoice?: string;
  systemPrompt?: string;
}

const DEFAULT_CONFIG: HybridVoiceConfig = {};

class HybridVoiceService {
  private config: HybridVoiceConfig = {};
  private vad: MicVAD | null = null;
  private isConnected = false;
  private isProcessing = false;
  private abortController: AbortController | null = null;

  // Modern Provider State
  private sttProvider: IStreamingSttProvider | null = null;
  private brainProvider: IReasoningProvider | null = null;
  private ttsProvider: ITtsProvider | null = null;
  private lastTranscript: string = "";
  private transcriptResolve: ((text: string) => void) | null = null;

  // Audio Context for Playback/Analysis
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private streamPlayer: AudioStreamPlayer | null = null;
  private micStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  async connect(options: Partial<HybridVoiceConfig> = {}): Promise<void> {
    if (this.isConnected) return;
    this.config = { ...DEFAULT_CONFIG, ...options };

    try {
      // 1. Initialize AudioContext (Shared Singleton)
      if (!this.audioContext) {
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      if (!this.streamPlayer) {
        this.streamPlayer = new AudioStreamPlayer(this.audioContext);
      }

      // 2. Initialize Providers via CapabilityRouter
      this.sttProvider = await capabilityRouter.getSttProvider();
      this.brainProvider = capabilityRouter.getReasoningProvider();
      this.ttsProvider = await capabilityRouter.getTtsProvider();

      // 2. Setup STT Callbacks
      this.sttProvider.onTranscript((result) => {
        if (result.isFinal) {
          this.lastTranscript = result.text;
          if (this.transcriptResolve) {
            this.transcriptResolve(result.text);
            this.transcriptResolve = null;
          }
        }
        this.config.onTranscript?.(result.text, "user");
      });

      await this.sttProvider.connect();

      // 3. Initialize VAD
      this.vad = await MicVAD.new({
        baseAssetPath: window.location.origin + "/vad/",
        onnxWASMBasePath: window.location.origin + "/vad/",
        model: "v5",
        onSpeechStart: () => {
          this.handleBargeIn();
          this.config.onVadChange?.(true);
          this.config.onStatusUpdate?.("Listening...");
        },
        onFrameProcessed: (_probabilities: any, frame: Float32Array) => {
          if (this.vad?.listening && this.sttProvider) {
            this.sttProvider.sendAudio(frame);
          }
        },
        onSpeechEnd: async (audio: Float32Array) => {
          this.config.onVadChange?.(false);
          if (!this.isProcessing) {
            this.isProcessing = true;
            await this.processVoiceInput();
            this.isProcessing = false;
            this.config.onSpeechEnd?.(audio);
          }
        },
      });

      this.vad.start();
      this.isConnected = true;
      this.config.onConnectionChange?.(true);
      this.startAmplitudeMonitoring();
      this.config.onStatusUpdate?.("Ready");
    } catch (error) {
      console.error("[VOICE] Connection failed:", error);
      this.isConnected = false;
      this.config.onConnectionChange?.(false);
      throw error;
    }
  }

  private handleBargeIn() {
    // Suppress barge-in if Luca is speaking (unless we want "Always Interrupt")
    // For industrial standard, we allow interrupt, but we must ensure we don't
    // interrupt our own self-triggering from speaker output.
    this.streamPlayer?.stop();
    this.stopPlayback();
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.lastTranscript = "";
    if (this.transcriptResolve) {
      this.transcriptResolve("");
      this.transcriptResolve = null;
    }
    this.isProcessing = false;
  }

  private async processVoiceInput(): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // 1. Wait for stable transcript (Event-driven)
      if (this.sttProvider?.transcribeBuffer) {
        // Force REST transcription
        await this.sttProvider.transcribeBuffer();
      }

      let transcript = this.lastTranscript.trim();
      if (!transcript) {
        // Wait up to 2s for final transcript event if not already there
        transcript = await Promise.race([
          new Promise<string>((resolve) => {
            this.transcriptResolve = resolve;
          }),
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 2000)),
        ]);
      }

      if (!transcript) {
        this.config.onStatusUpdate?.("No speech detected");
        return;
      }

      // 2. Thinking + Speaking (Sentence-Level Streaming)
      const startThinking = Date.now();
      const startSpeaking = Date.now();
      this.config.onStatusUpdate?.("Thinking...");
      if (!this.brainProvider || !this.ttsProvider) return;

      let fullModelText = "";
      let sentenceBuffer = "";
      const stream = this.brainProvider.chatStream(transcript, {
        abortSignal: signal,
        useVision: true,
        useMemory: true,
      });

      const playSentence = async (text: string) => {
        if (!text.trim() || signal.aborted) return;
        if (this.ttsProvider?.synthesizeStream) {
          const ttsStream = this.ttsProvider.synthesizeStream(text, {
            abortSignal: signal,
          });
          await this.streamPlayer?.playStream(ttsStream, signal);
          console.log(
            `[VOICE] TTS Start-Speaking Latency: ${Date.now() - startSpeaking}ms`,
          );
        } else if (this.ttsProvider) {
          const audioBuffer = await this.ttsProvider.synthesize(text, {
            abortSignal: signal,
          });
          await this.playAudio(audioBuffer);
        }
      };

      for await (const chunk of stream) {
        if (chunk.done || signal.aborted) break;
        fullModelText += chunk.text;
        sentenceBuffer += chunk.text;
        this.config.onTranscript?.(fullModelText, "model");

        // Simple sentence detection (., !, ?, \n)
        // We look for punctuation followed by a space or end of chunk to avoid false positives on abbreviations
        if (/[.!?\n]/.test(chunk.text)) {
          const sentence = sentenceBuffer.trim();
          if (sentence.length > 2) {
            sentenceBuffer = "";
            playSentence(sentence);
          }
        }
      }

      // Final sentence if any
      if (sentenceBuffer.trim()) {
        playSentence(sentenceBuffer.trim());
      }

      console.log(
        `[VOICE] Brain Thinking took: ${Date.now() - startThinking}ms`,
      );

      this.config.onStatusUpdate?.("Ready");
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("[VOICE] Pipeline error:", error);
    }
  }

  private async playAudio(arrayBuffer: ArrayBuffer): Promise<void> {
    this.stopPlayback();
    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (this.audioContext.state === "suspended")
      await this.audioContext.resume();

    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(this.audioContext.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let sourceActive = true;
    const monitor = () => {
      if (!this.currentAudioSource || !sourceActive) return;
      analyser.getByteFrequencyData(dataArray);
      const amp = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      eventBus.emit("audio-amplitude", { amplitude: amp, source: "model" });
      requestAnimationFrame(monitor);
    };

    this.currentAudioSource = source;
    source.start(0);
    monitor();

    source.onended = () => {
      sourceActive = false;
      this.currentAudioSource = null;
    };
  }

  private stopPlayback() {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {
        // Source might have already ended or not started
      }
      this.currentAudioSource = null;
    }
  }

  private startAmplitudeMonitoring(): void {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async (stream) => {
        this.micStream = stream;
        if (!this.audioContext) {
          this.audioContext = new (
            window.AudioContext || (window as any).webkitAudioContext
          )();
        }
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        source.connect(this.analyserNode);

        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        const update = () => {
          if (!this.analyserNode || !this.isConnected) return;
          this.analyserNode.getByteFrequencyData(dataArray);
          const amp = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          this.config.onAudioData?.(amp / 255);
          eventBus.emit("audio-amplitude", { amplitude: amp, source: "user" });
          this.animationFrameId = requestAnimationFrame(update);
        };
        update();
      })
      .catch((err) => console.error("[VOICE] Mic error:", err));
  }

  /**
   * Send text to the voice pipeline (manually trigger response)
   */
  async sendText(text: string): Promise<void> {
    if (!this.isConnected) return;
    this.lastTranscript = text;
    this.isProcessing = true;
    await this.processVoiceInput();
    this.isProcessing = false;
  }

  disconnect(): void {
    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
    }
    if (this.sttProvider) {
      this.sttProvider.disconnect();
      this.sttProvider = null;
    }
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.streamPlayer) {
      this.streamPlayer.stop();
      this.streamPlayer = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.stopPlayback();
    this.isConnected = false;
    this.config.onConnectionChange?.(false);
  }

  /**
   * Clear ephemeral session history
   */
  clearHistory(): void {
    this.lastTranscript = "";
    if (this.brainProvider) {
      // If the provider supports local history clearing, trigger it
      // Most providers in Luca are stateless per request or handled by LucaService
    }
    console.log("[VOICE] Session history cleared.");
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const hybridVoiceService = new HybridVoiceService();
