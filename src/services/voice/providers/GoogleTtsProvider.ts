import { ITtsProvider } from "../types";
import { settingsService } from "../../settingsService";
import { API_BASE_URL, getAuthHeaders } from "../../../config/api";

/**
 * GoogleTtsProvider: Handles high-fidelity neural voice synthesis.
 * Strictly Managed Mode: All requests route through the Luca Enterprise proxy.
 */
export class GoogleTtsProvider implements ITtsProvider {
  async synthesize(
    text: string,
    options?: {
      abortSignal?: AbortSignal;
      voiceId?: string;
      apiKey?: string;
    },
  ): Promise<ArrayBuffer> {
    const settings = settingsService.getSettings();
    const voiceId = options?.voiceId || settings.voice.voiceId || "en-US-Journey-F";

    // mode selection: Direct (if apiKey provides) or Managed (Default)
    if (options?.apiKey) {
      console.log("[VOICE] Google TTS: Using Direct Mode with provided API Key");
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${options.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: voiceId.substring(0, 5), name: voiceId },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: settings.voice.rate || 1.0,
            pitch: settings.voice.pitch ? (settings.voice.pitch - 1) * 20 : 0,
          },
        }),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Google Direct TTS error");
      }
      const data = await response.json();
      return this.base64ToArrayBuffer(data.audioContent);
    }

    // Strictly Luca Enterprise Managed Mode
    const response = await fetch(`${API_BASE_URL}/api/voice/google-tts`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text,
        voiceId,
        speakingRate: settings.voice.rate || 1.0,
        pitch: settings.voice.pitch || 1.0,
      }),
      signal: options?.abortSignal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Luca Enterprise TTS Error: ${response.status} ${errorData.error || "Managed service temporary unavailable"}`,
      );
    }

    return await response.arrayBuffer();
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal },
  ): AsyncIterable<ArrayBuffer> {
    // Note: Standard Google Cloud TTS REST API doesn't support native HTTP streaming in the same way OpenAI does.
    // Most implementations use the non-stream version or a WebSocket proxy.
    // For LUCA, we fallback to the buffered version for high-quality Neural voices.
    const buffer = await this.synthesize(text, options);
    yield buffer;
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
}
