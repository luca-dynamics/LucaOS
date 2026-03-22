export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface IStreamingSttProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendAudio(frame: Float32Array): void;
  onTranscript(callback: (result: TranscriptResult) => void): void;
  onError(callback: (error: Error) => void): void;
  transcribeBuffer?(): Promise<void>;
}

export interface ChatChunk {
  text: string;
  isFinal: boolean;
  done: boolean;
}

export interface IReasoningProvider {
  chatStream(
    text: string,
    options?: {
      useVision?: boolean;
      useMemory?: boolean;
      abortSignal?: AbortSignal;
    },
  ): AsyncIterable<ChatChunk>;
}

export interface ITtsProvider {
  synthesize(
    text: string,
    options?: {
      abortSignal?: AbortSignal;
      systemInstruction?: string;
      voiceId?: string;
      apiKey?: string;
    },
  ): Promise<ArrayBuffer>;

  synthesizeStream?(
    text: string,
    options?: {
      abortSignal?: AbortSignal;
      systemInstruction?: string;
      voiceId?: string;
      apiKey?: string;
    },
  ): AsyncIterable<ArrayBuffer>;
}

export type Modality = "brain" | "vision" | "stt" | "tts";

export interface CapabilityRouterConfig {
  stt: "deepgram" | "openai" | "groq" | "cortex" | "native";
  brain: "gemini" | "openai" | "anthropic" | "groq" | "cortex";
  tts: "openai" | "deepgram" | "cortex" | "native";
}
