export interface RuntimeConfig {
  sampleRate: number;
  channels: number;
  vadThreshold: number;
  speechTimeoutMs: number;
}

export interface ProviderConfig {
  defaultLlmProvider: string;
  defaultSttProvider: string;
  defaultTtsProvider: string;
  requestTimeoutMs: number;
  maxRetries: number;
}

export interface VoiceConfig {
  defaultOrbSize: number;
  defaultMaterial: string;
  enableReducedMotion: boolean;
  enableHighContrast: boolean;
}

export interface MemoryConfig {
  workingMemoryCapacity: number;
  enableEpisodicStorage: boolean;
  enableSemanticStorage: boolean;
}

export interface LucaConfig {
  environment: "development" | "staging" | "production";
  runtime: RuntimeConfig;
  providers: ProviderConfig;
  voice: VoiceConfig;
  memory: MemoryConfig;
}

export function createDefaultLucaConfig(): LucaConfig {
  return {
    environment: "development",
    runtime: {
      sampleRate: 16000,
      channels: 1,
      vadThreshold: 0.5,
      speechTimeoutMs: 3000,
    },
    providers: {
      defaultLlmProvider: "mock-gpt-4",
      defaultSttProvider: "mock-whisper",
      defaultTtsProvider: "mock-tts",
      requestTimeoutMs: 10000,
      maxRetries: 3,
    },
    voice: {
      defaultOrbSize: 220,
      defaultMaterial: "liquidGlass",
      enableReducedMotion: false,
      enableHighContrast: false,
    },
    memory: {
      workingMemoryCapacity: 20,
      enableEpisodicStorage: true,
      enableSemanticStorage: true,
    },
  };
}
