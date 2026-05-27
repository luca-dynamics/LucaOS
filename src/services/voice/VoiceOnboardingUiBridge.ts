import { VoiceOnboardingBridge } from "./VoiceOnboardingBridge";

export interface VoiceOnboardingUiBridgeState {
  currentStep: ReturnType<VoiceOnboardingBridge["getState"]>["currentStep"];
  userName?: string;
  theme?: string;
  backgroundOpacity?: number;
  modelMode?: "luca_prime" | "local_models" | "byok";
  localModelScanRequested?: boolean;
  preferences?: string[];
  completed: boolean;
  lastSpokenResponse?: string;
  lastTextResponse?: string;
  metadata: {
    bridgeKind: "voice_onboarding_ui_bridge_scaffold";
    uiComponentsTouched: false;
    modelManagerCalled: false;
    localModelScanStarted: false;
    audioApisCalled: false;
    sttApisCalled: false;
    ttsApisCalled: false;
    systemApisCalled: false;
  };
}

const metadata: VoiceOnboardingUiBridgeState["metadata"] = { bridgeKind: "voice_onboarding_ui_bridge_scaffold", uiComponentsTouched: false, modelManagerCalled: false, localModelScanStarted: false, audioApisCalled: false, sttApisCalled: false, ttsApisCalled: false, systemApisCalled: false };
export type VoiceOnboardingUiBridgeListener = (state: VoiceOnboardingUiBridgeState) => void;

export class VoiceOnboardingUiBridge {
  private listeners = new Set<VoiceOnboardingUiBridgeListener>();
  private lastSpokenResponse?: string;
  private lastTextResponse?: string;

  constructor(private readonly bridge: VoiceOnboardingBridge) {}

  subscribe(listener: VoiceOnboardingUiBridgeListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  getState(): VoiceOnboardingUiBridgeState {
    const state = this.bridge.getState();
    return { ...state, lastSpokenResponse: this.lastSpokenResponse, lastTextResponse: this.lastTextResponse, metadata: { ...metadata } };
  }

  handleText(input: string): VoiceOnboardingUiBridgeState { const r = this.bridge.handleText(input); this.lastSpokenResponse = r.spokenResponse; this.lastTextResponse = r.textResponse; return this.emit(); }
  handleTranscript(input: string): VoiceOnboardingUiBridgeState { const r = this.bridge.handleTranscript(input); this.lastSpokenResponse = r.spokenResponse; this.lastTextResponse = r.textResponse; return this.emit(); }
  reset(): VoiceOnboardingUiBridgeState { this.bridge.reset(); this.lastSpokenResponse = undefined; this.lastTextResponse = undefined; return this.emit(); }
  private emit(): VoiceOnboardingUiBridgeState { const s = this.getState(); this.listeners.forEach((l) => l(s)); return s; }
}
