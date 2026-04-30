import { IStreamingSttProvider, TranscriptResult } from "../types";
import { settingsService } from "../../settingsService";
import { WavEncoder } from "../utils/WavEncoder";

export class OpenAiSttProvider implements IStreamingSttProvider {
  private transcriptCallback: ((result: TranscriptResult) => void) | null =
    null;
  private errorCallback: ((error: Error) => void) | null = null;
  private audioBuffer: Float32Array[] = [];

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
    this.audioBuffer = []; // Clear after encoding

    const settings = settingsService.getSettings();
    const apiKey = settings.brain.openaiApiKey;
    if (!apiKey) throw new Error("OpenAI API Key not found.");

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    formData.append("model", "whisper-1");

    try {
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        },
      );

      const data = await response.json();
      if (data.text) {
        this.transcriptCallback?.({
          text: data.text,
          isFinal: true,
          confidence: 1.0,
        });
      }
    } catch (error) {
      this.errorCallback?.(error as Error);
    }
  }
}
