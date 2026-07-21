import {
  LucaVoiceHudControl,
  LucaVoiceHudControlResult,
  LucaVoiceHudMetadata,
  LucaVoiceHudState,
  LucaVoiceOutputEvent,
} from "./types";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import type { VoiceRuntimeState } from "./types";

const hudMetadata: LucaVoiceHudMetadata = {
  bridgeKind: "voice_hud_scaffold",
  audioApisCalled: false,
  microphoneApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
  requiresExplicitOptIn: true,
};

const createDefaultState = (): LucaVoiceHudState => ({
  visible: false,
  mode: "text",
  status: "idle",
  metadata: { ...hudMetadata },
});

export class VoiceHudRuntimeBridge {
  private state: LucaVoiceHudState = createDefaultState();

  constructor(
    private readonly eventBridge?: VoiceRuntimeEventBridge,
    private readonly defaultSessionId = "voice_hud_scaffold",
  ) {}

  getState(): LucaVoiceHudState {
    return { ...this.state, metadata: { ...this.state.metadata } };
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
        this.state = { ...this.state, status: "idle", currentResponse: undefined, currentTranscript: undefined };
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

    const result: LucaVoiceHudControlResult = {
      ok: true,
      state: this.getState(),
      metadata: { ...hudMetadata },
    };

    if (this.eventBridge) {
      try {
        this.eventBridge.recordCommandResult(
          {
            status: "handled",
            metadata: {
              runtimeKind: "voice_scaffold",
              audioApisCalled: false,
              sttApisCalled: false,
              ttsApisCalled: false,
              systemApisCalled: false,
              heavyModelsLoaded: false,
              storageWritesEnabled: false,
              requiresExplicitOptIn: true,
              control,
              source: "voice_hud_scaffold",
            },
          },
          { sessionId: this.state.activeSessionId ?? this.defaultSessionId, source: "voice_hud_scaffold" },
        );
      } catch {
        // non-fatal by contract
      }
    }

    return result;
  }

  updateTranscript(transcript?: string): LucaVoiceHudState {
    this.state = { ...this.state, currentTranscript: transcript };
    return this.getState();
  }

  updateResponse(response?: string): LucaVoiceHudState {
    this.state = { ...this.state, currentResponse: response };
    if (response && this.eventBridge) {
      try {
        const output: LucaVoiceOutputEvent = { kind: "tts_completed", text: response };
        this.eventBridge.recordOutputEvent(output, { sessionId: this.state.activeSessionId ?? this.defaultSessionId });
      } catch {
        // non-fatal by contract
      }
    }
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
    this.state = { ...this.state, error };
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
    this.state = createDefaultState();
    return this.getState();
  }
}
