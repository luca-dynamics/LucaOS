import { EventProducingRuntime, HealthState, Runtime } from "./Runtime";
import { IEventBus } from "../events/EventBus";
import { createAssistantEvent } from "../events/AssistantEvent";
import { RuntimeEventType } from "../events/AssistantEventType";

export class RuntimeManager {
  private runtimes: Map<string, Runtime> = new Map();

  constructor(private eventBus: IEventBus) {}

  public register(runtime: Runtime): void {
    if ("attach" in runtime && typeof (runtime as EventProducingRuntime).attach === "function") {
      (runtime as EventProducingRuntime).attach(this.eventBus);
    }
    this.runtimes.set(runtime.name, runtime);
  }

  public async startAll(): Promise<void> {
    for (const runtime of this.runtimes.values()) {
      await runtime.start();
      this.eventBus.publish(
        createAssistantEvent(RuntimeEventType.RuntimeStarted, "system", { name: runtime.name })
      );
    }
  }

  public async stopAll(): Promise<void> {
    for (const runtime of this.runtimes.values()) {
      await runtime.stop();
      this.eventBus.publish(
        createAssistantEvent(RuntimeEventType.RuntimeStopped, "system", { name: runtime.name })
      );
    }
  }

  public health(): Record<string, HealthState> {
    const report: Record<string, HealthState> = {};
    for (const [name, runtime] of this.runtimes.entries()) {
      report[name] = runtime.getHealth();
    }
    return report;
  }
}
