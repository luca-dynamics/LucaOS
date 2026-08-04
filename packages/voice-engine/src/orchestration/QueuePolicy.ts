import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { ToolEventType } from "../events/AssistantEventType";

export class QueuePolicy {
  private queue: Array<{ name: string; args: Record<string, unknown> }> = [];

  constructor(private bus: IEventBus) {}

  public enqueue(toolName: string, args: Record<string, unknown>): void {
    this.queue.push({ name: toolName, args });
    this.bus.publish(
      createAssistantEvent(ToolEventType.ToolExecutionQueued, "tool-runtime", { name: toolName, args })
    );
  }

  public next(): { name: string; args: Record<string, unknown> } | null {
    return this.queue.shift() || null;
  }

  public clear(): void {
    this.queue = [];
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}
