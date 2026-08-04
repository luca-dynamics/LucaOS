import { createAssistantEvent } from "../../src/events/AssistantEvent";
import { InteractionEventType } from "../../src/events/AssistantEventType";
import { INTERACTION_PROTOCOL_VERSION } from "../../src/constants/InteractionVersion";

export function runProtocolTests(): void {
  const evt = createAssistantEvent(InteractionEventType.WakeDetected, "user-input", {});
  if (evt.version !== INTERACTION_PROTOCOL_VERSION) {
    throw new Error(`Expected event version ${INTERACTION_PROTOCOL_VERSION}, got ${evt.version}`);
  }
}
