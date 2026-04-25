import { ITtsProvider } from "../types";
import { settingsService } from "../../settingsService";
import { API_BASE_URL, getAuthHeaders } from "../../../config/api";

/**
 * GeminiTtsProvider: A hybrid provider that bridges between the Multimodal Reasoning API 
 * and the Google Cloud Text-to-Speech Generative engine.
 */
export class GeminiTtsProvider implements ITtsProvider {
  private modelId: string;

  constructor(modelId: string = "gemini-2.0-flash") {
    const shortId = modelId.includes("/") ? modelId.split("/").pop()! : modelId;
    this.modelId = `models/${shortId}`;
  }

  async synthesize(
    text: string,
    options?: { abortSignal?: AbortSignal; systemInstruction?: string; voiceId?: string },
  ): Promise<ArrayBuffer> {
    const isLiveLoop = this.modelId.includes("live") || this.modelId.includes("loop");

    if (isLiveLoop) {
      console.log(`[GeminiTts] Using Live Bridge (Unified Tunnel) for: ${this.modelId}`);
      return this.synthesizeWithLiveBridge(text, options);
    }

    // Default: Use Google Cloud Generative TTS for Modular synthesis
    console.log(`[GeminiTts] Using Cloud Generative TTS for Modular expression: ${this.modelId}`);
    return this.synthesizeWithCloudTts(text, options);
  }

  private async synthesizeWithCloudTts(
    text: string,
    options?: { abortSignal?: AbortSignal; voiceId?: string }
  ): Promise<ArrayBuffer> {
    const settings = settingsService.getSettings();
    const apiKey = (window as any).GEMINI_API_KEY || localStorage.getItem("GEMINI_API_KEY");
    
    const voiceMap: Record<string, string> = {
      "aoede": "en-US-Journey-F",
      "fenrir": "en-US-Journey-D",
      "journey": "en-US-Journey-F",
    };

    const targetVoice = options?.voiceId?.toLowerCase() || settings.voice.voiceId?.toLowerCase() || "en-US-Journey-F";
    const mappedVoice = voiceMap[targetVoice] || targetVoice;

    try {
      if (apiKey) {
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: "en-US", name: mappedVoice },
            audioConfig: { audioEncoding: "MP3" },
          }),
          signal: options?.abortSignal,
        });

        if (response.ok) {
          const data = await response.json();
          return this.base64ToArrayBuffer(data.audioContent);
        }
      }

      const proxyResponse = await fetch(`${API_BASE_URL}/api/voice/google-tts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text,
          voiceId: mappedVoice,
          speakingRate: settings.voice.rate || 1.0,
        }),
        signal: options?.abortSignal,
      });

      return await proxyResponse.arrayBuffer();
    } catch (e) {
      console.error("[GeminiTts] Cloud TTS Synthesis failed:", e);
      throw e;
    }
  }

  private async synthesizeWithLiveBridge(
    text: string,
    options?: { abortSignal?: AbortSignal; systemInstruction?: string }
  ): Promise<ArrayBuffer> {
    // Current fallback to Cloud TTS until Live Loop requirements are finalized for one-offs
    return this.synthesizeWithCloudTts(text, options);
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal; systemInstruction?: string },
  ): AsyncIterable<ArrayBuffer> {
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
