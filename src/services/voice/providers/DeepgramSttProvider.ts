import { IStreamingSttProvider, TranscriptResult } from "../types";
import { DEEPGRAM_API_KEY } from "../../../config/api";

export class DeepgramSttProvider implements IStreamingSttProvider {
  private socket: WebSocket | null = null;
  private transcriptCallback: ((result: TranscriptResult) => void) | null =
    null;
  private errorCallback: ((error: Error) => void) | null = null;

  async connect(): Promise<void> {
    const apiKey = localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("Deepgram API Key not found.");

    this.socket = new WebSocket(
      "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&filler_words=true&smart_format=true&interim_results=true",
    );

    this.socket.onopen = () => {
      this.socket?.send(JSON.stringify({ type: "KeepAlive" }));
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel?.alternatives?.[0]) {
        const alt = data.channel.alternatives[0];
        if (alt.transcript && this.transcriptCallback) {
          this.transcriptCallback({
            text: alt.transcript,
            isFinal: data.is_final,
            confidence: alt.confidence,
          });
        }
      }
    };

    this.socket.onerror = () => {
      this.errorCallback?.(new Error("Deepgram WebSocket error"));
    };
  }

  async disconnect(): Promise<void> {
    this.socket?.close();
    this.socket = null;
  }

  sendAudio(frame: Float32Array): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const buffer = new Int16Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        buffer[i] = Math.max(-1, Math.min(1, frame[i])) * 0x7fff;
      }
      this.socket.send(buffer);
    }
  }

  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}
