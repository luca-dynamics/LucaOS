export type RuntimeLifecycleState =
  | "Booting"
  | "Initializing"
  | "Idle"
  | "Listening"
  | "Understanding"
  | "Thinking"
  | "Acting"
  | "Speaking"
  | "Recovering"
  | "Sleeping"
  | "Shutdown";

export class RuntimeState {
  private currentState: RuntimeLifecycleState = "Booting";
  private stateListeners: Set<(state: RuntimeLifecycleState) => void> = new Set();

  public transitionTo(newState: RuntimeLifecycleState): void {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.stateListeners.forEach((listener) => listener(newState));
  }

  public getState(): RuntimeLifecycleState {
    return this.currentState;
  }

  public onStateChange(listener: (state: RuntimeLifecycleState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }
}
