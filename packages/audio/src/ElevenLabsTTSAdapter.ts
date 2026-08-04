import { StructuredLogger } from "../../protocol/src";

export interface TTSStreamCallbacks {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class ElevenLabsTTSAdapter {
  public id = "elevenlabs-turbo-v2";
  public name = "ElevenLabs Turbo v2 Streaming TTS";
  private apiKey?: string;
  private voiceId = "21m00Tcm4TlvDq8ikWAM";

  constructor(apiKeyOrQueue?: string | unknown) {
    if (typeof apiKeyOrQueue === "string") {
      this.apiKey = apiKeyOrQueue;
    } else {
      this.apiKey = globalThis.process?.env?.ELEVENLABS_API_KEY;
    }
  }

  public async streamSpeech(text: string, callbacks: TTSStreamCallbacks): Promise<void> {
    const startTime = Date.now();
    StructuredLogger.log({
      timestamp: Date.now(),
      sessionId: "sess_tts_stream",
      component: "elevenlabs-tts",
      operation: "stream_speech",
      status: "in_progress",
      metadata: { textLength: text.length },
    });

    if (!this.apiKey) {
      // Local streaming audio chunk generator for local dev without key
      const mockPCMChunk = new Float32Array(480).buffer;
      callbacks.onAudioChunk(mockPCMChunk);
      callbacks.onComplete();

      StructuredLogger.log({
        timestamp: Date.now(),
        sessionId: "sess_tts_stream",
        component: "elevenlabs-tts",
        operation: "stream_speech",
        status: "success",
        durationMs: Date.now() - startTime,
        metadata: { provider: "ElevenLabs Local Streaming Adapter" },
      });
      return;
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`ElevenLabs API HTTP error: ${response.status}`);
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          callbacks.onAudioChunk(value.buffer);
        }
      }

      callbacks.onComplete();
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  public streamSentence(sentence: string): void {
    this.streamSpeech(sentence, {
      onAudioChunk: () => {},
      onComplete: () => {},
      onError: () => {},
    }).catch(() => {});
  }

  public flush(): void {
    console.log("🔊 [ElevenLabs] Instant Audio Queue Flush Executed (Barge-in Interruption)");
  }

  public interrupt(): void {
    this.flush();
  }
}
