import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { InteractionEventType } from "../events/AssistantEventType";
import { StreamingPolicy } from "./StreamingPolicy";

export class InterruptPolicy {
  constructor(private bus: IEventBus, private streamingPolicy: StreamingPolicy) {}

  public requestInterrupt(isResponding: boolean): boolean {
    if (isResponding) {
      this.bus.publish(
        createAssistantEvent(InteractionEventType.InterruptAccepted, "audio-runtime", {})
      );

      this.streamingPolicy.cancelStream();

      this.bus.publish(
        createAssistantEvent(InteractionEventType.Interrupted, "audio-runtime", {})
      );
      return true;
    } else {
      this.bus.publish(
        createAssistantEvent(InteractionEventType.InterruptRejected, "audio-runtime", {})
      );
      return false;
    }
  }
}
