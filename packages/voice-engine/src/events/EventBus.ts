import { AssistantEvent } from "./AssistantEvent";
import { AssistantEventType } from "./AssistantEventType";

export type EventListener = (event: AssistantEvent) => void;
export type Unsubscribe = () => void;

export interface IEventBus {
  publish(event: AssistantEvent): void;
  subscribe(type: AssistantEventType | "*", listener: EventListener): Unsubscribe;
  replay(sessionEvents: AssistantEvent[]): void;
}

export class EventBus implements IEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private eventHistory: AssistantEvent[] = [];

  public publish(event: AssistantEvent): void {
    this.eventHistory.push(event);

    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((fn) => fn(event));
    }

    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((fn) => fn(event));
    }
  }

  public subscribe(type: AssistantEventType | "*", listener: EventListener): Unsubscribe {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(listener);

    return () => {
      set.delete(listener);
    };
  }

  public replay(sessionEvents: AssistantEvent[]): void {
    for (const evt of sessionEvents) {
      this.publish(evt);
    }
  }

  public getHistory(): readonly AssistantEvent[] {
    return this.eventHistory;
  }
}
