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
import { personalityService } from "./personalityService";
import { settingsService } from "./settingsService";
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
  private activeRequestId: number = 0;
  private isGreetingMode: boolean = false;

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
  private rnnoiseNode: AudioWorkletNode | null = null;
  private wakeWordRecognizer: any = null;
  private lastWakeWordIntentTime: number = 0;
  private WAKE_WORD_VALIDITY_MS = 10000; // 10s window after "Hi Luca"
  private isSessionActive: boolean = false;

  async connect(options: Partial<HybridVoiceConfig> = {}): Promise<void> {
    if (this.isConnected) return;
    this.config = { ...DEFAULT_CONFIG, ...options };

    try {
      // 1. Initialize AudioContext (Shared Singleton)
      if (!this.audioContext) {
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({ sampleRate: 48000 });
      }
      if (!this.streamPlayer) {
        this.streamPlayer = new AudioStreamPlayer(this.audioContext);
      }

      // 2. Initialize Neural Noise Suppression (RNNoise)
      try {
        await this.audioContext.audioWorklet.addModule('/worklets/RNNoiseProcessor.js', { type: 'module' } as any);
        console.log("[VOICE] RNNoise AudioWorklet loaded");
      } catch (e) {
        console.error("[VOICE] Failed to load RNNoise Worklet:", e);
      }

      // 3. Initialize Providers via CapabilityRouter
      this.sttProvider = await capabilityRouter.getSttProvider();
      this.brainProvider = capabilityRouter.getReasoningProvider();
      this.ttsProvider = await capabilityRouter.getTtsProvider();

      // Setup STT Callbacks
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

      // 4. Set up Denoised Audio Pipeline
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // We use RNNoise instead
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      const micSource = this.audioContext.createMediaStreamSource(this.micStream);
      let vadStream = this.micStream;

      if (this.audioContext.audioWorklet) {
        this.rnnoiseNode = new AudioWorkletNode(this.audioContext, 'rnnoise-processor');
        const noiseDest = this.audioContext.createMediaStreamDestination();
        micSource.connect(this.rnnoiseNode);
        this.rnnoiseNode.connect(noiseDest);
        vadStream = noiseDest.stream;
        console.log("[VOICE] Denoising layer active");
      }

      // 5. Initialize Wake Word Detection (Gating)
      this.startWakeWordGating();

      // Listen for runtime settings changes (Wake Word Toggle)
      settingsService.on("settings-changed", (newSettings) => {
        if (newSettings.voice?.wakeWordEnabled) {
          this.startWakeWordGating();
        } else {
          this.stopWakeWordGating();
        }
      });

      // 6. Initialize VAD with Denoised Stream
      this.vad = await MicVAD.new({
        model: "v5",
        audioContext: this.audioContext,
        getStream: async () => vadStream,
        positiveSpeechThreshold: 0.7, // Slightly higher because audio is cleaner
        negativeSpeechThreshold: 0.5,
        minSpeechMs: 150,
        onSpeechStart: () => {
          if (!this.lastWakeWordIntentTime && !this.isSessionActive) {
            console.log("[HybridVoice] 🛑 Dropping speech - session inactive");
            return;
          }
          console.log("[HybridVoice] 🎙️ Speech started");
          this.config.onVadChange?.(true);
          this.config.onStatusUpdate?.("Listening...");
          eventBus.emit("voice-status-update", { status: "Listening..." });
        },
        onFrameProcessed: (_probabilities: any, frame: Float32Array) => {
          if (this.vad?.listening && this.sttProvider && this.isSessionActive) {
            this.sttProvider.sendAudio(frame);
          }
        },
        onSpeechEnd: async (audio: Float32Array) => {
          this.config.onVadChange?.(false);
          const wasActive = this.isSessionActive;
          this.isSessionActive = false; // Release lock

          if (wasActive && !this.isProcessing && !this.isGreetingMode) {
            this.config.onStatusUpdate?.("Thinking...");
            eventBus.emit("voice-status-update", { status: "Thinking..." });
            await this.processVoiceInput();
            this.config.onSpeechEnd?.(audio);
          }
        },
      });

      this.isGreetingMode = false;
      this.vad.start();
      
      this.isConnected = true;
      this.config.onConnectionChange?.(true);
      this.startAmplitudeMonitoringForStream(vadStream);

      this.config.onStatusUpdate?.("Ready");
      eventBus.emit("voice-status-update", { status: "Ready" });
    } catch (error) {
      console.error("[VOICE] Connection failed:", error);
      this.isConnected = false;
      this.config.onConnectionChange?.(false);
      throw error;
    }
  }

  private startWakeWordGating() {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const settings = settingsService.getSettings();
    if (!settings.voice.wakeWordEnabled) {
      console.log("[VOICE] Wake word disabled in settings. Skipping initialization.");
      return;
    }

    if (this.wakeWordRecognizer) {
      console.log("[VOICE] Wake word recognizer already active.");
      return;
    }

    this.wakeWordRecognizer = new SpeechRecognition();
    this.wakeWordRecognizer.continuous = true;
    this.wakeWordRecognizer.interimResults = true;
    this.wakeWordRecognizer.lang = "en-US";

    const WAKE_WORDS = ["hey luca", "hieluca", "hey lucca", "luca", "hello luca", "hi luca"];

    this.wakeWordRecognizer.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      
      const lower = transcript.toLowerCase().trim();
      
      // Industrial Matching: Trigger if sentence starts with or contains wake word
      const hasWord = WAKE_WORDS.some(word => {
        if (word === "luca") {
          // Special case for single name: must be start of sentence or standalone
          return lower === "luca" || lower.startsWith("luca ");
        }
        return lower.includes(word);
      });

      if (hasWord) {
        console.log("[VOICE] Wake word intent confirmed. Gating OPEN.");
        this.lastWakeWordIntentTime = Date.now();
        eventBus.emit("wake-word-triggered", { source: "hybrid-service" });
      }
    };

    this.wakeWordRecognizer.onerror = (e: any) => {
      if (e.error === 'network') {
        setTimeout(() => this.wakeWordRecognizer?.start(), 5000);
      }
    };

    this.wakeWordRecognizer.onend = () => {
      if (this.isConnected) {
        try { 
          this.wakeWordRecognizer.start(); 
        } catch (e) {
          // Speech recognition may already be running or stopped
          console.debug("[VOICE] Speech recognition restart handle ignored:", e);
        }
      }
    };

    try {
      this.wakeWordRecognizer.start();
    } catch (e) {
      console.error("[VOICE] Speech Recognition Error:", e);
    }
  }

  private stopWakeWordGating() {
    if (this.wakeWordRecognizer) {
      console.log("[VOICE] Stopping Wake Word Gating...");
      try {
        this.wakeWordRecognizer.stop();
        this.wakeWordRecognizer.onend = null;
        this.wakeWordRecognizer.onresult = null;
        this.wakeWordRecognizer.onerror = null;
      } catch (e) {
        console.error("[VOICE] Error stopping wake word recognizer:", e);
      }
      this.wakeWordRecognizer = null;
    }
  }

  private startAmplitudeMonitoringForStream(stream: MediaStream): void {
    if (!this.audioContext) return;
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
  }

  private handleBargeIn() {
    if (this.isGreetingMode) return; // Cinematic protection: Welcome message cannot be broken
    this.activeRequestId++; // Invalidate previous turns
    this.isProcessing = false;
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
  }

  private async processVoiceInput(): Promise<void> {
    const requestId = ++this.activeRequestId;
    this.isProcessing = true;
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
      eventBus.emit("voice-status-update", { status: "Thinking..." });
      if (!this.brainProvider || !this.ttsProvider) return;

      let fullModelText = "";
      let sentenceBuffer = "";
      const stream = this.brainProvider.chatStream(transcript, {
        model: this.config.llmModel,
        systemInstruction: this.config.systemPrompt,
        abortSignal: signal,
        useVision: true,
        useMemory: true,
      });

      const playSentence = async (text: string) => {
        if (!text.trim() || signal.aborted) return;
        
        const settings = settingsService.getSettings();
        const voiceInstruction = personalityService.getVoiceSystemInstruction({
          style: settings.voice.style,
          pacing: settings.voice.pacing,
        });

        if (this.ttsProvider?.synthesizeStream) {
          const ttsStream = this.ttsProvider.synthesizeStream(text, {
            abortSignal: signal,
            systemInstruction: voiceInstruction,
          });
          await this.streamPlayer?.playStream(ttsStream, signal);
          console.log(
            `[VOICE] TTS Start-Speaking Latency: ${Date.now() - startSpeaking}ms`,
          );
        } else if (this.ttsProvider) {
          const audioBuffer = await this.ttsProvider.synthesize(text, {
            abortSignal: signal,
            systemInstruction: voiceInstruction,
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

      if (this.activeRequestId === requestId) {
        this.config.onStatusUpdate?.("Ready");
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("[VOICE] Pipeline error:", error);
    } finally {
      if (this.activeRequestId === requestId) {
        this.isProcessing = false;
        // Refresh intent window so follow-up sentences work without re-triggering wake word
        this.lastWakeWordIntentTime = Date.now();
      }
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


  /**
   * Send text to the voice pipeline (manually trigger response)
   */
  async sendText(text: string): Promise<void> {
    if (!this.isConnected) return;
    this.lastTranscript = text;
    await this.processVoiceInput();
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
    if (this.rnnoiseNode) {
      this.rnnoiseNode.disconnect();
      this.rnnoiseNode = null;
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
