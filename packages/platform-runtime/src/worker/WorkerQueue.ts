import { WorkerMessage } from "../../../contracts/src";

export class WorkerQueue {
  private queue: WorkerMessage[] = [];

  public enqueue(job: WorkerMessage): void {
    this.queue.push(job);
    console.log(`📋 [WorkerQueue] Enqueued background job #${job.jobId} (${job.taskType})`);
  }

  public dequeue(): WorkerMessage | undefined {
    return this.queue.shift();
  }

  public size(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
  }
}
