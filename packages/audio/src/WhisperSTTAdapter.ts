import { EventBus, InteractionEventType } from "../../voice-engine/src";
import { LUCA_PLATFORM_PROTOCOL_VERSION } from "../../protocol/src";

export class WhisperSTTAdapter {
  private isStreaming = false;

  constructor(private eventBus: EventBus) {}

  public startStreaming(): void {
    this.isStreaming = true;
  }

  public pushPartialText(text: string, isFinal = false): void {
    if (!this.isStreaming) return;

    this.eventBus.publish({
      id: `evt_stt_${Date.now()}`,
      sessionId: "sess_stt",
      type: InteractionEventType.TurnStarted,
      source: "user-input",
      timestamp: Date.now(),
      version: LUCA_PLATFORM_PROTOCOL_VERSION,
      payload: { transcript: text, isFinal },
    });
  }

  public stopStreaming(): void {
    this.isStreaming = false;
  }
}
