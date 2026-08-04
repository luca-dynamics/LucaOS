import { IEventBus } from "../events/EventBus";
import { TurnPolicy } from "./TurnPolicy";
import { StreamingPolicy } from "./StreamingPolicy";
import { InterruptPolicy } from "./InterruptPolicy";
import { QueuePolicy } from "./QueuePolicy";

export class ConversationOrchestrator {
  public turnPolicy: TurnPolicy;
  public streamingPolicy: StreamingPolicy;
  public interruptPolicy: InterruptPolicy;
  public queuePolicy: QueuePolicy;

  constructor(private bus: IEventBus) {
    this.turnPolicy = new TurnPolicy(this.bus);
    this.streamingPolicy = new StreamingPolicy(this.bus);
    this.interruptPolicy = new InterruptPolicy(this.bus, this.streamingPolicy);
    this.queuePolicy = new QueuePolicy(this.bus);
  }

  public handleBargeIn(isResponding: boolean): boolean {
    return this.interruptPolicy.requestInterrupt(isResponding);
  }
}
