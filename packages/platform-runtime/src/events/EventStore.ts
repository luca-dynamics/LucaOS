import { RuntimeEvent } from "../../../contracts/src";

export class EventStore {
  private events: RuntimeEvent[] = [];
  private sequenceCounter = 0;

  public append(event: Omit<RuntimeEvent, "id" | "sequence">): RuntimeEvent {
    this.sequenceCounter++;
    const fullEvent: RuntimeEvent = {
      ...event,
      id: `evt_${Date.now()}_${this.sequenceCounter}`,
      sequence: this.sequenceCounter,
    };
    this.events.push(fullEvent);
    console.log(`📜 [EventStore] Appended Event #${fullEvent.sequence} [${fullEvent.domain}.${fullEvent.type}] for Session #${fullEvent.sessionId}`);
    return fullEvent;
  }

  public appendBatch(events: Array<Omit<RuntimeEvent, "id" | "sequence">>): RuntimeEvent[] {
    return events.map((e) => this.append(e));
  }

  public stream(sessionId: string): readonly RuntimeEvent[] {
    return this.events.filter((e) => e.sessionId === sessionId);
  }

  public load(sequence: number): RuntimeEvent | undefined {
    return this.events.find((e) => e.sequence === sequence);
  }

  public getAllEvents(): readonly RuntimeEvent[] {
    return this.events;
  }
}
