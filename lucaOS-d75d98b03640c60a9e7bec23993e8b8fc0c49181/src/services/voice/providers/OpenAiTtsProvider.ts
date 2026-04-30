import { ITtsProvider } from "../types";
import { settingsService } from "../../settingsService";

export class OpenAiTtsProvider implements ITtsProvider {
  async synthesize(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ArrayBuffer> {
    const settings = settingsService.getSettings();
    const apiKey = settings.brain.openaiApiKey;
    if (!apiKey) throw new Error("OpenAI API Key not found.");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "shimmer",
      }),
      signal: options?.abortSignal,
    });

    if (!response.ok) throw new Error("OpenAI TTS failed");
    return await response.arrayBuffer();
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): AsyncIterable<ArrayBuffer> {
    const settings = settingsService.getSettings();
    const apiKey = settings.brain.openaiApiKey;
    if (!apiKey) throw new Error("OpenAI API Key not found.");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "shimmer",
        response_format: "mp3",
      }),
      signal: options?.abortSignal,
    });

    if (!response.ok) throw new Error("OpenAI TTS failed");
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
