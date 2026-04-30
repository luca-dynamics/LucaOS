import { ITtsProvider } from "../types";
import { getGenClient } from "../../genAIClient";

export class GeminiTtsProvider implements ITtsProvider {
  async synthesize(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ArrayBuffer> {
    const client = getGenClient();
    // Assuming a specialized model or method for TTS in the SDK or a direct fetch to the synthesis endpoint
    // For Gemini 2.0+ it's often part of the multimodal response, but we can hit the specialized endpoint
    const apiKey = (client as any).apiKey;

    // Fallback to the REST endpoint if the SDK doesn't expose it directly yet
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            response_mime_type: "audio/pcm", // Or appropriate audio type
          },
        }),
        signal: options?.abortSignal,
      },
    );

    if (!response.ok) throw new Error("Gemini TTS failed");
    return await response.arrayBuffer();
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): AsyncIterable<ArrayBuffer> {
    const client = getGenClient();
    const apiKey = (client as any).apiKey;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            response_mime_type: "audio/pcm",
          },
        }),
        signal: options?.abortSignal,
      },
    );

    if (!response.ok) throw new Error("Gemini TTS failed");
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
