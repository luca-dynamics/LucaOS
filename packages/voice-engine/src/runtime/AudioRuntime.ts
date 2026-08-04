import { EventProducingRuntime, HealthState } from "./Runtime";
import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { AudioEventType, InteractionEventType } from "../events/AssistantEventType";

export class AudioRuntime implements EventProducingRuntime {
  public name = "AudioRuntime";
  private bus?: IEventBus;
  private isRunning = false;

  public attach(bus: IEventBus): void {
    this.bus = bus;
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    this.bus?.publish(createAssistantEvent(AudioEventType.ListeningStarted, "audio-runtime", {}));
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.bus?.publish(createAssistantEvent(AudioEventType.MicrophoneStopped, "audio-runtime", {}));
  }

  public async dispose(): Promise<void> {
    await this.stop();
  }

  public getHealth(): HealthState {
    return this.isRunning ? "healthy" : "unavailable";
  }

  // Simulated VAD Signal Inputs
  public triggerWakeWord(): void {
    if (!this.isRunning) return;
    this.bus?.publish(createAssistantEvent(InteractionEventType.WakeDetected, "audio-runtime", {}));
  }

  public triggerSpeechDetected(): void {
    if (!this.isRunning) return;
    this.bus?.publish(createAssistantEvent(AudioEventType.SpeechDetected, "audio-runtime", {}));
  }

  public triggerSpeechEnded(): void {
    if (!this.isRunning) return;
    this.bus?.publish(createAssistantEvent(AudioEventType.SpeechEnded, "audio-runtime", {}));
  }
}
