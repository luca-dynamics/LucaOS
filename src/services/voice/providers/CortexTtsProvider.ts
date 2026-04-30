import { ITtsProvider } from "../types";
import { cortexUrl } from "../../../config/api";
import { settingsService } from "../../settingsService";

export class CortexTtsProvider implements ITtsProvider {
  async synthesize(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ArrayBuffer> {
    const url = cortexUrl("/tts");
    const settings = settingsService.getSettings();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text,
        speed: settings.voice.rate || 1.0
      }),
      signal: options?.abortSignal,
    });

    if (!response.ok) throw new Error("Cortex TTS failed");
    
    // The Python backend returns a JSON object: { type: "audio", data: "base64...", format: "wav" }
    const result = await response.json();
    if (result.data) {
      return this.base64ToArrayBuffer(result.data);
    }
    throw new Error("Invalid response from Cortex TTS");
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): AsyncIterable<ArrayBuffer> {
    // The Cortex /tts backend currently does not support native binary streaming.
    // It returns a full JSON object. We yield the buffered result as a single chunk
    // to maintain the AsyncIterable interface while ensuring data is correctly decoded.
    const buffer = await this.synthesize(text, options);
    if (buffer && buffer.byteLength > 0) {
      yield buffer;
    }
  }
}
