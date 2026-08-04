import { EventBus, AudioEventType } from "../../voice-engine/src";
import { LUCA_PLATFORM_PROTOCOL_VERSION } from "../../protocol/src";

export class VADDetector {
  private isSpeechActive = false;
  private energyThreshold = 0.45;

  constructor(private eventBus: EventBus) {}

  public processAudioChunk(energy: number): void {
    if (energy >= this.energyThreshold && !this.isSpeechActive) {
      this.isSpeechActive = true;
      this.eventBus.publish({
        id: `evt_vad_${Date.now()}`,
        sessionId: "sess_audio",
        type: AudioEventType.SpeechDetected,
        source: "audio-runtime",
        timestamp: Date.now(),
        version: LUCA_PLATFORM_PROTOCOL_VERSION,
        payload: { energy },
      });
    } else if (energy < this.energyThreshold && this.isSpeechActive) {
      this.isSpeechActive = false;
      this.eventBus.publish({
        id: `evt_vad_end_${Date.now()}`,
        sessionId: "sess_audio",
        type: AudioEventType.SpeechEnded,
        source: "audio-runtime",
        timestamp: Date.now(),
        version: LUCA_PLATFORM_PROTOCOL_VERSION,
        payload: { energy },
      });
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeechActive;
  }
}
