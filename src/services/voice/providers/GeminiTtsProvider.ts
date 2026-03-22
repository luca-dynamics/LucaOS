import { ITtsProvider } from "../types";
import { getGenClient } from "../../genAIClient";
import { personalityService } from "../../personalityService";
import { settingsService } from "../../settingsService";
import { voiceCloneService } from "../../VoiceCloneService";

export class GeminiTtsProvider implements ITtsProvider {
  private modelId: string;

  constructor(modelId: string = "gemini-2.0-flash") {
    // Ensure we have the short ID (e.g. gemini-2.0-flash) for the URL
    this.modelId = modelId.includes("/") ? modelId.split("/").pop()! : modelId;
  }

  async synthesize(
    text: string,
    options?: { abortSignal?: AbortSignal; systemInstruction?: string },
  ): Promise<ArrayBuffer> {
    const genAI = getGenClient();
    const contents = await this.prepareContents(text, options);
    
    const result = await genAI.models.generateContent({
      model: this.modelId,
      contents,
      config: {
        responseMimeType: "audio/mp3",
      },
    });

    const part = result.candidates?.[0].content?.parts?.find(
      (p: any) => p.inlineData,
    );

    if (part?.inlineData?.data) {
      const base64 = part.inlineData.data;
      return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
    }

    throw new Error("Gemini TTS failed to generate audio data");
  }

  async *synthesizeStream(
    text: string,
    options?: { abortSignal?: AbortSignal; systemInstruction?: string },
  ): AsyncIterable<ArrayBuffer> {
    const genAI = getGenClient();
    const contents = await this.prepareContents(text, options);
    
    const stream = await genAI.models.generateContentStream({
      model: this.modelId,
      contents,
      config: {
        responseMimeType: "audio/mp3",
      },
    });

    for await (const chunk of stream) {
      if (options?.abortSignal?.aborted) break;
      
      const part = chunk.candidates?.[0].content?.parts?.find(
        (p: any) => p.inlineData,
      );

      if (part?.inlineData?.data) {
        const base64 = part.inlineData.data;
        yield Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
      }
    }
  }

  private async prepareContents(text: string, options?: any) {
    const settings = settingsService.getSettings();
    const instruction = options?.systemInstruction || personalityService.getVoiceSystemInstruction({
      style: settings.voice.style,
      pacing: settings.voice.pacing
    });
    
    const parts: any[] = [{ text: `${instruction}\n\n#### TRANSCRIPT\n"${text}"` }];

    if (settings.voice.activeClonedVoiceId) {
      try {
        const clonedVoice = await voiceCloneService.getVoice(settings.voice.activeClonedVoiceId);
        if (clonedVoice?.audioBlob) {
          const base64Audio = await voiceCloneService.blobToBase64(clonedVoice.audioBlob);
          const cleanBase64 = base64Audio.split(",")[1];
          
          parts.unshift({
            text: "Use the following audio clip as a reference for the voice tone, timbre, and accent. MIMIC this voice exactly when speaking the transcript below.",
          });
          parts.unshift({
            inlineData: {
              mimeType: "audio/mp3",
              data: cleanBase64,
            },
          });
        }
      } catch (e) {
        console.warn("[GeminiTtsProvider] Voice cloning reference failed:", e);
      }
    }

    return [{ role: "user", parts }];
  }
}
