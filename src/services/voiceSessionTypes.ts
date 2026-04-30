import type { HybridVoiceConfig } from "./hybridVoiceService";
import type { LiveConfig } from "./liveService";
import type { VoiceSessionRoute } from "./voiceSessionRouter";

export interface IVoiceSessionRuntime<TConfig> {
  connect(config: TConfig): Promise<void> | void;
  sendText(text: string): Promise<void> | void;
  disconnect(...args: any[]): Promise<void> | void;
  readonly connected: boolean;
  readonly status: string;
  readonly routeKind: VoiceSessionRoute["kind"] | null;
  readonly canBargeIn: boolean;
  readonly supportsAudioOutput: boolean;
}

export type VoiceSessionRuntime =
  | IVoiceSessionRuntime<LiveConfig>
  | IVoiceSessionRuntime<Partial<HybridVoiceConfig>>;
