import { LucaVoiceMode, LucaVoiceRuntimeStatus } from "./types";

export interface VoiceModeUiBridgeState {
  mode: LucaVoiceMode;
  status: LucaVoiceRuntimeStatus;
  activeSessionId?: string;
  currentTranscript?: string;
  currentResponse?: string;
  error?: string;
  metadata: {
    bridgeKind: "voice_mode_ui_bridge_scaffold";
    uiComponentsTouched: false;
    audioApisCalled: false;
    microphoneApisCalled: false;
    sttApisCalled: false;
    ttsApisCalled: false;
    providerApisCalled: false;
    systemApisCalled: false;
    requiresExplicitOptIn: true;
  };
}

export type VoiceModeUiBridgeListener = (state: VoiceModeUiBridgeState) => void;

export interface VoiceModeRuntimeLike {
  getState?: () => { status?: LucaVoiceRuntimeStatus; session?: { sessionId?: string; mode?: LucaVoiceMode } };
  startSession?: (params?: { mode?: LucaVoiceMode }) => { sessionId?: string };
  stopSession?: () => void;
  handleTextInput?: (input: { text: string }) => { textResponse?: string };
  handleTranscript?: (input: { transcript: string }) => { textResponse?: string };
  reset?: () => void;
}

const metadata: VoiceModeUiBridgeState["metadata"] = {
  bridgeKind: "voice_mode_ui_bridge_scaffold",
  uiComponentsTouched: false,
  audioApisCalled: false,
  microphoneApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  providerApisCalled: false,
  systemApisCalled: false,
  requiresExplicitOptIn: true,
};

const initialState = (): VoiceModeUiBridgeState => ({ mode: "text", status: "idle", metadata: { ...metadata } });

export class VoiceModeUiBridge {
  private state: VoiceModeUiBridgeState = initialState();
  private readonly listeners = new Set<VoiceModeUiBridgeListener>();

  constructor(private readonly runtime?: VoiceModeRuntimeLike) {}

  getState(): VoiceModeUiBridgeState { return { ...this.state, metadata: { ...this.state.metadata } }; }
  getSnapshot(): VoiceModeUiBridgeState { return this.getState(); }

  subscribe(listener: VoiceModeUiBridgeListener): () => void {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: VoiceModeUiBridgeListener): void { this.listeners.delete(listener); }

  setMode(mode: LucaVoiceMode): VoiceModeUiBridgeState { return this.patch({ mode }); }

  startVoiceSession(): VoiceModeUiBridgeState {
    const session = this.runtime?.startSession?.({ mode: "voice" });
    return this.patch({ mode: "voice", status: "listening", activeSessionId: session?.sessionId });
  }

  stopVoiceSession(): VoiceModeUiBridgeState {
    this.runtime?.stopSession?.();
    return this.patch({ status: "idle", activeSessionId: undefined });
  }

  handleTextInput(input: string): VoiceModeUiBridgeState {
    const result = this.runtime?.handleTextInput?.({ text: input });
    return this.patch({ status: "acting", currentTranscript: input, currentResponse: result?.textResponse });
  }

  handleTranscript(input: string): VoiceModeUiBridgeState {
    const result = this.runtime?.handleTranscript?.({ transcript: input });
    return this.patch({ status: "acting", currentTranscript: input, currentResponse: result?.textResponse });
  }

  reset(): VoiceModeUiBridgeState {
    this.runtime?.reset?.();
    this.state = initialState();
    this.emit();
    return this.getState();
  }

  private patch(partial: Partial<VoiceModeUiBridgeState>): VoiceModeUiBridgeState {
    this.state = { ...this.state, ...partial };
    this.emit();
    return this.getState();
  }

  private emit(): void { const next = this.getState(); this.listeners.forEach((l) => l(next)); }
}
