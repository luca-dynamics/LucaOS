import { IStreamingSttProvider, TranscriptResult } from "../types";
import { getGenClient } from "../../genAIClient";
import { WavEncoder } from "../utils/WavEncoder";
import { eventBus } from "../../eventBus";

/**
 * GeminiSttProvider: Native Multimodal STT using Gemini 2.0/2.5.
 * Unlike traditional STT, this uses the actual multimodal model state
 * to transcribe audio, which allows it to preserve context and emotion.
 */
export class GeminiSttProvider implements IStreamingSttProvider {
  private transcriptCallback: ((result: TranscriptResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private audioBuffer: Float32Array[] = [];
  private modelId: string;

  constructor(modelId: string = "gemini-2.0-flash") {
    // Ensure we have the short ID (e.g. gemini-2.0-flash)
    this.modelId = modelId.includes("/") ? modelId.split("/").pop()! : modelId;
  }

  async connect(): Promise<void> {
    this.audioBuffer = [];
  }

  async disconnect(): Promise<void> {
    this.audioBuffer = [];
  }

  sendAudio(frame: Float32Array): void {
    this.audioBuffer.push(new Float32Array(frame));
  }

  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  async transcribeBuffer(): Promise<void> {
    if (this.audioBuffer.length === 0) return;

    const audioBlob = WavEncoder.encode(this.audioBuffer);
    this.audioBuffer = []; // Clear for next turn

    try {
      const genAI = getGenClient();
      
      // Convert Blob to Base64 for the SDK (Browser-friendly)
      const base64Data = await this.blobToBase64(audioBlob);

      const startTime = Date.now();
      const result = await genAI.models.generateContent({
        model: this.modelId,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "audio/wav",
                  data: base64Data,
                },
              },
              { text: "TRANSCRIPTION TASK: Transcribe the provided audio exactly as spoken. Return ONLY the transcript text. Do not add explanations, metadata, or dialogue markers." },
            ],
          },
        ],
        config: {
          temperature: 0.1, // Keep it precise for transcription
        }
      });

      const latency = Date.now() - startTime;
      eventBus.emit("telemetry-update", {
        stt: { cloud: latency, fastest: "cloud" }
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (text) {
        this.transcriptCallback?.({
          text: text.trim(),
          isFinal: true,
          confidence: 1.0,
        });
      }
    } catch (error) {
      console.error("[GeminiSTT] Native transcription failed:", error);
      this.errorCallback?.(error as Error);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
