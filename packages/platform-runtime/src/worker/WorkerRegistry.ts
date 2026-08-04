import { WorkerMessage } from "../../../contracts/src";

export interface WorkerTaskHandler {
  taskType: string;
  name: string;
  execute: (payload: Record<string, unknown>) => Promise<unknown>;
}

export class WorkerRegistry {
  private handlers = new Map<string, WorkerTaskHandler>();

  public register(handler: WorkerTaskHandler): void {
    this.handlers.set(handler.taskType, handler);
    console.log(`⚙️ [WorkerRegistry] Registered worker handler '${handler.name}' for task type '${handler.taskType}'`);
  }

  public get(taskType: string): WorkerTaskHandler | undefined {
    return this.handlers.get(taskType);
  }

  public list(): WorkerTaskHandler[] {
    return Array.from(this.handlers.values());
  }
}
