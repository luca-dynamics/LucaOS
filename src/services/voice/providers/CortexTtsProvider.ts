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
    return await response.arrayBuffer();
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): AsyncIterable<ArrayBuffer> {
    const url = cortexUrl("/tts");
    const settings = settingsService.getSettings();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text, 
        stream: true,
        speed: settings.voice.rate || 1.0
      }),
      signal: options?.abortSignal,
    });

    if (!response.ok) throw new Error("Cortex TTS failed");
    if (!response.body) return;

    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          yield value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
          );
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
