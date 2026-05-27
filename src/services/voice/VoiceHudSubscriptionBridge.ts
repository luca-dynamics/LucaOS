import { LucaVoiceHudControl, LucaVoiceHudState } from "./types";
import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceRuntimeState } from "./VoiceRuntime";

export type VoiceHudSubscriptionListener = (state: LucaVoiceHudState) => void;

export class VoiceHudSubscriptionBridge {
  private readonly listeners = new Set<VoiceHudSubscriptionListener>();

  constructor(private readonly bridge: VoiceHudRuntimeBridge) {}

  getState(): LucaVoiceHudState { return this.bridge.getState(); }
  subscribe(listener: VoiceHudSubscriptionListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  sendControl(control: LucaVoiceHudControl): LucaVoiceHudState { this.bridge.sendControl(control); return this.emit(); }
  updateTranscript(transcript?: string): LucaVoiceHudState { this.bridge.updateTranscript(transcript); return this.emit(); }
  updateResponse(response?: string): LucaVoiceHudState { this.bridge.updateResponse(response); return this.emit(); }
  updateCommand(command?: string): LucaVoiceHudState { this.bridge.updateCommand(command); return this.emit(); }
  updateConfirmation(confirmationId?: string): LucaVoiceHudState { this.bridge.updateConfirmation(confirmationId); return this.emit(); }
  updateError(error?: string): LucaVoiceHudState { this.bridge.updateError(error); return this.emit(); }
  syncFromVoiceRuntimeState(state: VoiceRuntimeState): LucaVoiceHudState { this.bridge.syncFromVoiceRuntimeState(state); return this.emit(); }
  reset(): LucaVoiceHudState { this.bridge.reset(); return this.emit(); }

  private emit(): LucaVoiceHudState { const s = this.getState(); this.listeners.forEach((l) => l(s)); return s; }
}
