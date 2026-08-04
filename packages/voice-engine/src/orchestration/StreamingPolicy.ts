import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { InteractionEventType, LLMEventType } from "../events/AssistantEventType";

export class StreamingPolicy {
  private isStreaming = false;

  constructor(private bus: IEventBus) {}

  public handleToken(token: string): void {
    if (!this.isStreaming) {
      this.isStreaming = true;
      this.bus.publish(
        createAssistantEvent(InteractionEventType.ResponseStreamingStarted, "llm-runtime", {})
      );
    }

    this.bus.publish(createAssistantEvent(LLMEventType.LLMTokenStream, "llm-runtime", token));
  }

  public finishStream(): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    this.bus.publish(
      createAssistantEvent(InteractionEventType.ResponseStreamingFinished, "llm-runtime", {})
    );
  }

  public cancelStream(): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    this.bus.publish(
      createAssistantEvent(InteractionEventType.ResponseCancelled, "llm-runtime", {})
    );
  }
}
