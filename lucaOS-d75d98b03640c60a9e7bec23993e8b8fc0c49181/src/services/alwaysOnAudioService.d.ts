export interface AudioSentryConfig {
  enabled?: boolean;
  captureInterval?: number;
  analysisInterval?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  maxCpuUsage?: number;
  sensitivity?: number;
  eventTypes?: string[];
  notifications?: {
    voice?: boolean;
    visual?: boolean;
    chat?: boolean;
  };
  instruction?: string | null;
}

export class AlwaysOnAudioService {
  config: AudioSentryConfig;
  isRunning: boolean;
  stats: any;

  start(config?: AudioSentryConfig): void;
  stop(): void;
  updateConfig(newConfig: AudioSentryConfig): void;
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    platform: string;
    config: AudioSentryConfig;
    stats: any;
  };
  getStats(): any;
  setInstruction(text: string | null): void;
}

export const alwaysOnAudioService: AlwaysOnAudioService;
