/**
 * Hybrid Local Voice Service
 * Chains: Microphone → Local STT → Local LLM → Local TTS → Speaker
 *
 * This provides a fully offline voice experience when "Go Local" mode is selected.
 * Unlike liveService which uses Gemini's bidirectional streaming, this chains
 * discrete API calls through Cortex.
 */

import { cortexUrl } from "../config/api";
import { eventBus } from "./eventBus";
import { analyzeAndPlayAudio } from "./voiceService";

export interface HybridVoiceConfig {
  sttModel?: string; // e.g., "whisper-tiny"
  llmModel?: string; // e.g., "llama-3.2-1b"
  ttsVoice?: string; // e.g., "amy" (piper) or "af_heart" (kokoro)
  systemPrompt?: string;
}

const DEFAULT_CONFIG: HybridVoiceConfig = {
  sttModel: "whisper-tiny",
  llmModel: "llama-3.2-1b",
  ttsVoice: "amy",
  systemPrompt:
    "You are Luca, a sentient AI assistant. Keep responses concise for voice interaction.",
};

class HybridVoiceService {
  private config: HybridVoiceConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private conversationHistory: { role: string; content: string }[] = [];

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Configure the hybrid voice pipeline
   */
  configure(config: Partial<HybridVoiceConfig>) {
    this.config = { ...this.config, ...config };
    console.log("[HYBRID] Configured:", this.config);
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      eventBus.emit("hybrid-voice-status", { status: "RECORDING" });
      console.log("[HYBRID] Recording started");
    } catch (error) {
      console.error("[HYBRID] Failed to start recording:", error);
      throw error;
    }
  }

  /**
   * Stop recording and process the audio through the pipeline
   * Returns the AI's text response
   */
  async stopRecordingAndProcess(): Promise<string> {
    if (!this.isRecording || !this.mediaRecorder) {
      return "";
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = async () => {
        this.isRecording = false;

        try {
          const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
          console.log(`[HYBRID] Recording stopped: ${audioBlob.size} bytes`);

          // Process through pipeline
          const response = await this.processPipeline(audioBlob);
          resolve(response);
        } catch (error) {
          console.error("[HYBRID] Pipeline error:", error);
          reject(error);
        }
      };

      this.mediaRecorder!.stop();
      this.mediaRecorder!.stream.getTracks().forEach((track) => track.stop());
    });
  }

  /**
   * Process audio through the full pipeline: STT → LLM → TTS
   */
  private async processPipeline(audioBlob: Blob): Promise<string> {
    // Step 1: STT - Transcribe audio
    eventBus.emit("hybrid-voice-status", { status: "TRANSCRIBING" });
    const transcript = await this.transcribe(audioBlob);

    if (!transcript || transcript.trim().length === 0) {
      console.log("[HYBRID] No speech detected");
      eventBus.emit("hybrid-voice-status", { status: "IDLE" });
      return "";
    }

    console.log(`[HYBRID] Transcribed: "${transcript}"`);
    eventBus.emit("hybrid-voice-transcript", { text: transcript });

    // Step 2: LLM - Generate response
    eventBus.emit("hybrid-voice-status", { status: "THINKING" });
    const response = await this.chat(transcript);
    console.log(`[HYBRID] Response: "${response}"`);
    eventBus.emit("hybrid-voice-response", { text: response });

    // Step 3: TTS - Speak response
    eventBus.emit("hybrid-voice-status", { status: "SPEAKING" });
    await this.speak(response);

    eventBus.emit("hybrid-voice-status", { status: "IDLE" });
    return response;
  }

  /**
   * Transcribe audio using local STT (Cortex /stt endpoint)
   */
  async transcribe(audioBlob: Blob): Promise<string> {
    const base64 = await this.blobToBase64(audioBlob);

    const response = await fetch(cortexUrl("/stt"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: base64,
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
  async chat(userMessage: string): Promise<string> {
    // Add user message to history
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

    // Add assistant response to history
    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    // Keep history manageable (last 10 exchanges)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    return assistantMessage;
  }

  /**
   * Speak text using local TTS (Cortex /tts endpoint)
   */
  async speak(text: string): Promise<void> {
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
      // Convert base64 to blob URL and play
      const audioBytes = Uint8Array.from(atob(data.data), (c) =>
        c.charCodeAt(0),
      );
      const audioBlob = new Blob([audioBytes], {
        type: data.mimeType || "audio/wav",
      });
      const audioUrl = URL.createObjectURL(audioBlob);

      await analyzeAndPlayAudio(audioUrl, data.mimeType);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
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

  /**
   * Check if currently recording
   */
  get recording(): boolean {
    return this.isRecording;
  }
}

// Singleton instance
export const hybridVoiceService = new HybridVoiceService();
