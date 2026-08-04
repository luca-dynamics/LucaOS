import { EventBus, InteractionEventType } from "../../voice-engine/src";
import { LUCA_PLATFORM_PROTOCOL_VERSION } from "../../protocol/src";

export class SentenceAudioQueue {
  private queue: string[] = [];
  private isPlaying = false;
  private isInterrupted = false;

  constructor(private eventBus: EventBus) {}

  public enqueueSentence(sentence: string): void {
    if (this.isInterrupted) return;
    this.queue.push(sentence);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.queue.length === 0 || this.isInterrupted) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const currentSentence = this.queue.shift();

    // Publish Speech Started Event
    this.eventBus.publish({
      id: `evt_tts_${Date.now()}`,
      sessionId: "sess_tts",
      type: InteractionEventType.ResponseStreamingStarted,
      source: "audio-runtime",
      timestamp: Date.now(),
      version: LUCA_PLATFORM_PROTOCOL_VERSION,
      payload: { sentence: currentSentence },
    });

    // Simulate sentence playback duration (15ms per character)
    const duration = Math.min(2000, (currentSentence?.length ?? 10) * 15);
    await new Promise((resolve) => setTimeout(resolve, duration));

    if (!this.isInterrupted && this.queue.length > 0) {
      this.playNext();
    } else {
      this.isPlaying = false;
    }
  }

  public interrupt(): void {
    this.isInterrupted = true;
    this.queue = [];
    this.isPlaying = false;

    this.eventBus.publish({
      id: `evt_bargein_${Date.now()}`,
      sessionId: "sess_tts",
      type: InteractionEventType.Interrupted,
      source: "user-input",
      timestamp: Date.now(),
      version: LUCA_PLATFORM_PROTOCOL_VERSION,
      payload: { reason: "barge_in" },
    });
  }

  public reset(): void {
    this.isInterrupted = false;
    this.queue = [];
    this.isPlaying = false;
  }
}
