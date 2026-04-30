import { ITtsProvider } from "../types";
import { DEEPGRAM_API_KEY } from "../../../config/api";

export class DeepgramTtsProvider implements ITtsProvider {
  async synthesize(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ArrayBuffer> {
    const apiKey = localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("Deepgram API Key not found.");

    const response = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-athena-en",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: options?.abortSignal,
      },
    );

    if (!response.ok) throw new Error("Deepgram TTS failed");
    return await response.arrayBuffer();
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): AsyncIterable<ArrayBuffer> {
    const apiKey = localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("Deepgram API Key not found.");

    const response = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-athena-en",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: options?.abortSignal,
      },
    );

    if (!response.ok) throw new Error("Deepgram TTS failed");
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
