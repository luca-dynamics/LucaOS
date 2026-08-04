import { EngineStateContainer, createInitialEngineState } from "../state/InteractionState";
import { AssistantEvent } from "../events/AssistantEvent";
import { IEventBus } from "../events/EventBus";
import { transition } from "../state/transition";

export type StateChangeListener = (state: EngineStateContainer) => void;

export class InteractionStore {
  private state: EngineStateContainer;
  private listeners: Set<StateChangeListener> = new Set();

  constructor(private eventBus: IEventBus) {
    this.state = createInitialEngineState();

    // Subscribe to ALL events from EventBus
    this.eventBus.subscribe("*", (event: AssistantEvent) => {
      this.handleEvent(event);
    });
  }

  private handleEvent(event: AssistantEvent): void {
    try {
      this.state = transition(this.state, event);
      this.notifyListeners();
    } catch (err) {
      // Ignore unhandled illegal transitions silently or forward to system error
    }
  }

  public getState(): EngineStateContainer {
    return this.state;
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => fn(this.state));
  }
}
