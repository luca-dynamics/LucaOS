import { EventBus } from "../../src/events/EventBus";
import { createAssistantEvent } from "../../src/events/AssistantEvent";
import { AudioEventType } from "../../src/events/AssistantEventType";

export function runEventBusTests(): void {
  const bus = new EventBus();
  const received: string[] = [];

  const unsubscribe = bus.subscribe(AudioEventType.SpeechDetected, (evt) => {
    received.push(evt.id);
  });

  const evt1 = createAssistantEvent(AudioEventType.SpeechDetected, "audio-runtime", {});
  bus.publish(evt1);

  if (received.length !== 1 || received[0] !== evt1.id) {
    throw new Error("EventBus failed to deliver event to subscriber");
  }

  unsubscribe();
  const evt2 = createAssistantEvent(AudioEventType.SpeechDetected, "audio-runtime", {});
  bus.publish(evt2);

  if (received.length !== 1) {
    throw new Error("EventBus delivered event after unsubscribe");
  }
}
