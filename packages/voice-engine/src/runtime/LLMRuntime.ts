import { EventProducingRuntime, HealthState } from "./Runtime";
import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { LLMEventType } from "../events/AssistantEventType";

export class LLMRuntime implements EventProducingRuntime {
  public name = "LLMRuntime";
  private bus?: IEventBus;
  private isRunning = false;

  public attach(bus: IEventBus): void {
    this.bus = bus;
  }

  public async start(): Promise<void> {
    this.isRunning = true;
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
  }

  public async dispose(): Promise<void> {
    await this.stop();
  }

  public getHealth(): HealthState {
    return this.isRunning ? "healthy" : "unavailable";
  }

  public async streamPrompt(_prompt: string, simulatedTokens: string[]): Promise<void> {
    if (!this.isRunning) return;

    this.bus?.publish(createAssistantEvent(LLMEventType.LLMStarted, "llm-runtime", {}));

    for (const token of simulatedTokens) {
      this.bus?.publish(createAssistantEvent(LLMEventType.LLMTokenStream, "llm-runtime", token));
    }

    this.bus?.publish(createAssistantEvent(LLMEventType.LLMCompleted, "llm-runtime", {}));
  }
}
