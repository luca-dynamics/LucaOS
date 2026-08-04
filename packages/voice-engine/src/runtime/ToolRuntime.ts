import { EventProducingRuntime, HealthState } from "./Runtime";
import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { ToolEventType } from "../events/AssistantEventType";

export class ToolRuntime implements EventProducingRuntime {
  public name = "ToolRuntime";
  private bus?: IEventBus;
  private isRunning = false;

  public attach(bus: IEventBus): void {
    this.bus = bus;
  }

  public async start(): Promise<void> {
    this.isRunning = true;
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
  }

  public async dispose(): Promise<void> {
    await this.stop();
  }

  public getHealth(): HealthState {
    return this.isRunning ? "healthy" : "unavailable";
  }

  public async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.isRunning) return null;

    this.bus?.publish(
      createAssistantEvent(ToolEventType.ToolExecutionQueued, "tool-runtime", { name: toolName, args })
    );

    this.bus?.publish(
      createAssistantEvent(ToolEventType.ToolExecutionStarted, "tool-runtime", { name: toolName })
    );

    const simulatedResult = { status: "success", tool: toolName, output: "Tool payload executed" };

    this.bus?.publish(
      createAssistantEvent(ToolEventType.ToolExecutionCompleted, "tool-runtime", simulatedResult)
    );

    return simulatedResult;
  }
}
