import { EventBus, createAssistantEvent, SystemEventType } from "../../../voice-engine/src";
import { WorkerMessage } from "../../../contracts/src";
import { WorkerRegistry } from "./WorkerRegistry";
import { WorkerQueue } from "./WorkerQueue";

export class WorkerScheduler {
  public registry: WorkerRegistry;
  public queue: WorkerQueue;
  private activeJobs = new Map<string, WorkerMessage>();

  constructor(public eventBus: EventBus) {
    this.registry = new WorkerRegistry();
    this.queue = new WorkerQueue();
  }

  public async scheduleJob(taskType: string, payload: Record<string, unknown>): Promise<WorkerMessage> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const job: WorkerMessage = {
      jobId,
      taskType,
      status: "queued",
      payload,
      timestamp: Date.now(),
    };

    this.queue.enqueue(job);
    this.processNextJob().catch(() => {});
    return job;
  }

  private async processNextJob(): Promise<void> {
    const job = this.queue.dequeue();
    if (!job) return;

    const handler = this.registry.get(job.taskType);
    if (!handler) {
      job.status = "failed";
      job.error = `No worker handler registered for task type '${job.taskType}'`;
      this.notifyJob(job);
      return;
    }

    job.status = "running";
    this.activeJobs.set(job.jobId, job);
    this.notifyJob(job);

    try {
      const result = await handler.execute(job.payload);
      job.status = "completed";
      job.result = result;
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.activeJobs.delete(job.jobId);
      this.notifyJob(job);
    }
  }

  private notifyJob(job: WorkerMessage): void {
    const evt = createAssistantEvent(
      SystemEventType.StateReset,
      "system",
      { workerJob: job },
      { sessionId: "sess_worker" }
    );
    this.eventBus.publish(evt);
    console.log(`🔔 [WorkerNotifications] Background Job #${job.jobId} (${job.taskType}) status: ${job.status.toUpperCase()}`);
  }
}
