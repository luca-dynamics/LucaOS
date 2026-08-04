import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { InteractionEventType } from "../events/AssistantEventType";
import { TurnContext, createTurnContext } from "./TurnContext";

export class TurnPolicy {
  private activeTurn: TurnContext | null = null;

  constructor(private bus: IEventBus) {}

  public startTurn(sessionId = "session_default"): TurnContext {
    if (this.activeTurn) {
      this.cancelTurn("Superceded by new turn");
    }

    const ctx = createTurnContext(sessionId);
    this.activeTurn = ctx;

    this.bus.publish(
      createAssistantEvent(InteractionEventType.TurnStarted, "system", { turnId: ctx.turnId })
    );

    return ctx;
  }

  public completeTurn(): void {
    if (!this.activeTurn) return;

    this.bus.publish(
      createAssistantEvent(InteractionEventType.TurnCompleted, "system", {
        turnId: this.activeTurn.turnId,
      })
    );

    this.activeTurn = null;
  }

  public cancelTurn(reason: string): void {
    if (!this.activeTurn) return;

    this.bus.publish(
      createAssistantEvent(InteractionEventType.TurnCancelled, "system", {
        turnId: this.activeTurn.turnId,
        reason,
      })
    );

    this.activeTurn = null;
  }

  public getActiveTurn(): TurnContext | null {
    return this.activeTurn;
  }
}
