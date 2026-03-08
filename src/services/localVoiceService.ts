/**
 * Local Voice Service - Production-Grade Continuous Streaming Voice
 *
 * Uses Silero VAD (@ricky0123/vad-web) for real-time voice activity detection
 * Chains: Microphone → VAD → STT (Cortex) → LLM (Cortex) → TTS (Cortex) → Speaker
 *
 * Compatible with: Web, Android (Capacitor), iOS (Capacitor)
 */

import { MicVAD, utils } from "@ricky0123/vad-web";
import { cortexUrl } from "../config/api";
import { eventBus } from "./eventBus";

export interface LocalVoiceConfig {
  sttModel?: string;
  llmModel?: string;
  ttsVoice?: string;
  systemPrompt?: string;
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onTranscript?: (text: string, source: "user" | "model") => void;
  onAudioData?: (amplitude: number) => void;
  onVadChange?: (active: boolean) => void;
  onStatusUpdate?: (status: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

const DEFAULT_CONFIG: LocalVoiceConfig = {
  sttModel: "whisper-tiny",
  llmModel: "llama-3.2-1b",
  ttsVoice: "amy",
  systemPrompt:
    "You are Luca, a sentient AI assistant. Keep responses concise for voice interaction.",
};

class LocalVoiceService {
  private config: LocalVoiceConfig;
  private vad: MicVAD | null = null;
  private isConnected = false;
  private isProcessing = false;
  private conversationHistory: { role: string; content: string }[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Connect and start continuous voice listening
   * Matches liveService.connect() API for seamless integration
   */
  async connect(options: Partial<LocalVoiceConfig> = {}): Promise<void> {
    if (this.isConnected) {
      console.log("[LOCAL VOICE] Already connected");
      return;
    }

    this.config = { ...DEFAULT_CONFIG, ...options };
    console.log("[LOCAL VOICE] Connecting with config:", this.config);

    try {
      // Initialize VAD with Silero model
      this.vad = await MicVAD.new({
        // Use absolute URLs to bypass Vite's /public import resolution issues
        baseAssetPath: window.location.origin + "/vad/",
        onnxWASMBasePath: window.location.origin + "/vad/",
        ortConfig: (ort: any) => {
          const origin = window.location.origin;
          // Map internal .mjs requests to absolute public URLs
          // This forces the browser to fetch from /public instead of Vite trying to bundle them
          ort.env.wasm.wasmPaths = {
            "ort-wasm-simd-threaded.mjs": `${origin}/vad/ort-wasm-simd-threaded.mjs`,
            "ort-wasm-simd-threaded.asyncify.mjs": `${origin}/vad/ort-wasm-simd-threaded.asyncify.mjs`,
            "ort-wasm-simd-threaded.jsep.mjs": `${origin}/vad/ort-wasm-simd-threaded.jsep.mjs`,
            "ort-wasm-simd-threaded.jspi.mjs": `${origin}/vad/ort-wasm-simd-threaded.jspi.mjs`,
            "ort-wasm-simd-threaded.wasm": `${origin}/vad/ort-wasm-simd-threaded.wasm`,
            "ort-wasm-simd-threaded.asyncify.wasm": `${origin}/vad/ort-wasm-simd-threaded.asyncify.wasm`,
          };
          ort.env.logLevel = "error";
        },
        model: "v5",
        positiveSpeechThreshold: 0.8,
        negativeSpeechThreshold: 0.35,
        // Use milliseconds-based options per API
        preSpeechPadMs: 100,
        redemptionMs: 300,

        onSpeechStart: () => {
          console.log("[LOCAL VOICE] Speech started");
          this.config.onVadChange?.(true);
          this.config.onStatusUpdate?.("Listening...");

          // Stop any playing audio (barge-in)
          this.stopCurrentAudio();
        },

        onSpeechEnd: async (audio: Float32Array) => {
          console.log("[LOCAL VOICE] Speech ended, processing...");
          this.config.onVadChange?.(false);

          if (this.isProcessing) {
            console.log("[LOCAL VOICE] Already processing, skipping");
            return;
          }

          this.isProcessing = true;
          await this.processVoiceInput(audio);
          this.isProcessing = false;
        },

        onVADMisfire: () => {
          console.log("[LOCAL VOICE] VAD misfire (too short)");
          this.config.onVadChange?.(false);
        },
      });

      // Start VAD listening
      this.vad.start();
      this.isConnected = true;
      this.config.onConnectionChange?.(true);
      this.config.onStatusUpdate?.("Connected - Listening");

      // Start amplitude monitoring for VoiceHud orb
      this.startAmplitudeMonitoring();

      console.log("[LOCAL VOICE] Connected and listening");
    } catch (error) {
      console.error("[LOCAL VOICE] Connection failed:", error);
      this.config.onStatusUpdate?.(`Failed: ${error}`);
      this.config.onConnectionChange?.(false);
      throw error;
    }
  }

  /**
   * Disconnect and stop listening
   */
  disconnect(): void {
    console.log("[LOCAL VOICE] Disconnecting...");

    if (this.vad) {
      this.vad.pause();
      this.vad.destroy();
      this.vad = null;
    }

    this.stopAmplitudeMonitoring();
    this.stopCurrentAudio();
    this.conversationHistory = [];
    this.isConnected = false;
    this.isProcessing = false;

    this.config.onConnectionChange?.(false);
    console.log("[LOCAL VOICE] Disconnected");
  }

  /**
   * Process voice input through the full pipeline: STT → LLM → TTS
   */
  private async processVoiceInput(audio: Float32Array): Promise<void> {
    try {
      // 1. Convert Float32Array to WAV
      this.config.onStatusUpdate?.("Transcribing...");
      const wavData = utils.encodeWAV(audio);
      // Handle both ArrayBuffer and Blob returns from encodeWAV
      const wavBlob =
        wavData instanceof Blob
          ? wavData
          : new Blob([wavData], { type: "audio/wav" });
      const base64Audio = await this.blobToBase64(wavBlob);

      // 2. STT - Transcribe
      const transcript = await this.transcribe(base64Audio);

      if (!transcript || transcript.trim().length === 0) {
        console.log("[LOCAL VOICE] No speech detected");
        this.config.onStatusUpdate?.("No speech detected");
        return;
      }

      console.log(`[LOCAL VOICE] Transcribed: "${transcript}"`);
      this.config.onTranscript?.(transcript, "user");

      // 3. LLM - Generate response
      this.config.onStatusUpdate?.("Thinking...");
      const response = await this.chat(transcript);
      console.log(`[LOCAL VOICE] Response: "${response}"`);
      this.config.onTranscript?.(response, "model");

      // 4. TTS - Speak response
      this.config.onStatusUpdate?.("Speaking...");
      await this.speak(response);

      this.config.onStatusUpdate?.("Listening...");
    } catch (error) {
      console.error("[LOCAL VOICE] Pipeline error:", error);
      this.config.onStatusUpdate?.(`Error: ${error}`);
    }
  }

  /**
   * Transcribe audio using local STT (Cortex /stt endpoint)
   */
  private async transcribe(base64Audio: string): Promise<string> {
    const response = await fetch(cortexUrl("/stt"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: base64Audio,
        model: this.config.sttModel,
        engine: "faster-whisper",
      }),
    });

    if (!response.ok) {
      throw new Error(`STT Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.transcript || "";
  }

  /**
   * Generate response using local LLM (Cortex /chat/completions endpoint)
   */
  private async chat(userMessage: string): Promise<string> {
    this.conversationHistory.push({ role: "user", content: userMessage });

    const response = await fetch(cortexUrl("/chat/completions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.llmModel,
        messages: [
          { role: "system", content: this.config.systemPrompt },
          ...this.conversationHistory,
        ],
        max_tokens: 256,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM Error: ${response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage =
      data.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process that.";

    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    // Keep history manageable
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    return assistantMessage;
  }

  /**
   * Speak text using local TTS (Cortex /tts endpoint)
   */
  private async speak(text: string): Promise<void> {
    const response = await fetch(cortexUrl("/tts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        voice: this.config.ttsVoice,
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.type === "audio" && data.data) {
      const audioBytes = Uint8Array.from(atob(data.data), (c) =>
        c.charCodeAt(0),
      );
      const audioBlob = new Blob([audioBytes], {
        type: data.mimeType || "audio/wav",
      });
      const audioUrl = URL.createObjectURL(audioBlob);

      await this.playAudio(audioUrl);
    }
  }

  /**
   * Play audio using AudioContext for amplitude analysis and barge-in support
   */
  private async playAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stopCurrentAudio();

      (async () => {
        try {
          if (!this.audioContext) {
            this.audioContext = new (
              window.AudioContext || (window as any).webkitAudioContext
            )();
          }

          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
          }

          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer =
            await this.audioContext.decodeAudioData(arrayBuffer);

          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;

          const analyser = this.audioContext.createAnalyser();
          analyser.fftSize = 256;

          source.connect(analyser);
          analyser.connect(this.audioContext.destination);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let playing = true;

          const monitorOutput = () => {
            if (!playing) return;
            analyser.getByteFrequencyData(dataArray);
            const amp = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

            eventBus.emit("audio-amplitude", {
              amplitude: amp,
              source: "model",
            });

            if (playing) {
              requestAnimationFrame(monitorOutput);
            }
          };

          monitorOutput();

          source.onended = () => {
            playing = false;
            this.currentAudioSource = null;
            resolve();
          };

          this.currentAudioSource = source;
          source.start(0);
        } catch (e) {
          console.error("[LOCAL VOICE] Playback error:", e);
          reject(e);
        }
      })();
    });
  }

  /**
   * Stop currently playing audio (for barge-in)
   */
  private stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.currentAudioSource = null;
    }
  }

  /**
   * Start amplitude monitoring for VoiceHud orb animation
   */
  private startAmplitudeMonitoring(): void {
    if (this.animationFrameId) return;

    // Get microphone stream for amplitude analysis
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async (stream) => {
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();

        // Resume context if suspended (macOS policy)
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        source.connect(this.analyserNode);

        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

        const updateAmplitude = () => {
          if (!this.analyserNode || !this.isConnected) return;

          this.analyserNode.getByteFrequencyData(dataArray);
          const rawAmplitude =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length; // 0-255

          const normalizedAmplitude = rawAmplitude / 255;
          this.config.onAudioData?.(normalizedAmplitude);

          // Standardized broadcast for all listeners (Hologram, VoiceHUD)
          eventBus.emit("audio-amplitude", {
            amplitude: rawAmplitude,
            source: "user",
          });

          if (this.isConnected) {
            this.animationFrameId = requestAnimationFrame(updateAmplitude);
          }
        };

        updateAmplitude();
      })
      .catch((err) => {
        console.error("[LOCAL VOICE] Amplitude monitoring failed:", err);
      });
  }

  /**
   * Stop amplitude monitoring
   */
  private stopAmplitudeMonitoring(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyserNode = null;
  }

  /**
   * Send text message (for voice-to-text fallback)
   */
  async sendText(text: string): Promise<void> {
    if (!this.isConnected) {
      console.warn("[LOCAL VOICE] Not connected");
      return;
    }

    this.isProcessing = true;
    this.config.onTranscript?.(text, "user");

    this.config.onStatusUpdate?.("Thinking...");
    const response = await this.chat(text);
    this.config.onTranscript?.(response, "model");

    this.config.onStatusUpdate?.("Speaking...");
    await this.speak(response);

    this.config.onStatusUpdate?.("Listening...");
    this.isProcessing = false;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Check if currently connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Helper: Convert Blob to Base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Singleton instance
export const localVoiceService = new LocalVoiceService();
