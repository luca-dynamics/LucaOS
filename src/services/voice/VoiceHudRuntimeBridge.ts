import { VoiceRuntimeState } from "./VoiceRuntime";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import {
  LucaVoiceHudControl,
  LucaVoiceHudControlResult,
  LucaVoiceHudMetadata,
  LucaVoiceHudState,
} from "./types";

const defaultMetadata: LucaVoiceHudMetadata = {
  bridgeKind: "voice_hud_scaffold",
  audioApisCalled: false,
  microphoneApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
  requiresExplicitOptIn: true,
};

export class VoiceHudRuntimeBridge {
  private state: LucaVoiceHudState = {
    visible: false,
    mode: "text",
    status: "idle",
    metadata: defaultMetadata,
  };

  constructor(private readonly eventBridge?: VoiceRuntimeEventBridge) {}

  getState(): LucaVoiceHudState {
    return {
      ...this.state,
      metadata: { ...this.state.metadata },
    };
  }

  sendControl(control: LucaVoiceHudControl): LucaVoiceHudControlResult {
    switch (control) {
      case "show":
        this.state = { ...this.state, visible: true };
        break;
      case "hide":
        this.state = { ...this.state, visible: false };
        break;
      case "toggle":
        this.state = { ...this.state, visible: !this.state.visible };
        break;
      case "start_listening":
        this.state = { ...this.state, visible: true, mode: "voice", status: "listening" };
        break;
      case "stop_listening":
        this.state = { ...this.state, status: "idle" };
        break;
      case "set_text_mode":
        this.state = { ...this.state, mode: "text" };
        break;
      case "set_voice_mode":
        this.state = { ...this.state, mode: "voice" };
        break;
      case "interrupt":
        this.state = { ...this.state, currentResponse: undefined, currentTranscript: undefined, status: "idle" };
        break;
      case "clear":
        this.state = {
          ...this.state,
          currentTranscript: undefined,
          currentResponse: undefined,
          activeCommand: undefined,
          error: undefined,
        };
        break;
    }

    this.recordControl(control);
    return this.makeResult(true);
  }

  updateTranscript(transcript?: string): LucaVoiceHudState {
    this.state = { ...this.state, currentTranscript: transcript };
    return this.getState();
  }

  updateResponse(response?: string): LucaVoiceHudState {
    this.state = { ...this.state, currentResponse: response };
    this.recordOutput(response);
    return this.getState();
  }

  updateCommand(command?: string): LucaVoiceHudState {
    this.state = { ...this.state, activeCommand: command };
    return this.getState();
  }

  updateConfirmation(confirmationId?: string): LucaVoiceHudState {
    this.state = { ...this.state, confirmationId };
    return this.getState();
  }

  updateError(error?: string): LucaVoiceHudState {
    this.state = { ...this.state, error, status: error ? "error" : this.state.status };
    return this.getState();
  }

  syncFromVoiceRuntimeState(runtimeState: VoiceRuntimeState): LucaVoiceHudState {
    this.state = {
      ...this.state,
      status: runtimeState.status,
      activeSessionId: runtimeState.session?.sessionId,
      detectedLanguage: runtimeState.session?.language,
      mode: runtimeState.session?.mode ?? this.state.mode,
      confirmationId: runtimeState.pendingConfirmation?.confirmationId,
    };
    return this.getState();
  }

  reset(): LucaVoiceHudState {
    this.state = {
      visible: false,
      mode: "text",
      status: "idle",
      metadata: defaultMetadata,
    };
    return this.getState();
  }

  private makeResult(ok: boolean, reason?: string): LucaVoiceHudControlResult {
    return { ok, state: this.getState(), reason, metadata: { ...defaultMetadata } };
  }

  private recordControl(control: LucaVoiceHudControl): void {
    try {
      this.eventBridge?.recordCommandResult(
        {
          status: "handled",
          textResponse: `voice_hud_control:${control}`,
          spokenResponse: `voice_hud_control:${control}`,
          metadata: {
            runtimeKind: "voice_scaffold",
            audioApisCalled: false,
            sttApisCalled: false,
            ttsApisCalled: false,
            systemApisCalled: false,
            heavyModelsLoaded: false,
            storageWritesEnabled: false,
            requiresExplicitOptIn: true,
          },
        },
        { sessionId: this.state.activeSessionId, source: "voice_hud_scaffold" },
      );
    } catch {
      // non-fatal by design
    }
  }

  private recordOutput(response?: string): void {
    if (!response) return;

    try {
      this.eventBridge?.recordOutputEvent(
        {
          kind: "tts_completed",
          text: response,
          metadata: { source: "voice_hud_scaffold" },
        },
        { sessionId: this.state.activeSessionId },
      );
    } catch {
      // non-fatal by design
    }
  }
}
