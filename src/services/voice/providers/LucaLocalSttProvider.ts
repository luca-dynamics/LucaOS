import { IStreamingSttProvider, TranscriptResult } from "../types";
import { cortexUrl } from "../../../config/api";
import { WavEncoder } from "../utils/WavEncoder";
import { eventBus } from "../../eventBus";
import { settingsService } from "../../settingsService";

export class LucaLocalSttProvider implements IStreamingSttProvider {
  public name = "local-luca";
  private transcriptCallback: ((result: TranscriptResult) => void) | null =
    null;
  private errorCallback: ((error: Error) => void) | null = null;
  private audioBuffer: Float32Array[] = [];

  async connect(): Promise<void> {
    this.audioBuffer = [];
    console.log("[Local STT] Connected to Local Whisper Core");
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

    try {
      const audioBlob = WavEncoder.encode(this.audioBuffer);
      this.audioBuffer = []; // Clear for next segment

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append(
        "model",
        settingsService.getSettings().voice?.sttModel || "whisper-tiny",
      );

      const startTime = Date.now();
      const response = await fetch(`${cortexUrl}/stt/transcribe`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      const latency = Date.now() - startTime;
      eventBus.emit("telemetry-update", {
        stt: { local: latency, fastest: "local" }
      });

      if (!response.ok) {
        throw new Error(`Local Whisper Error: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.text && this.transcriptCallback) {
        this.transcriptCallback({
          text: result.text,
          isFinal: true,
          confidence: result.confidence || 1.0,
        });
      }
    } catch (error: any) {
      console.error("[Local STT] Transcription failed:", error);
      this.errorCallback?.(error as Error);
    }
  }
}
