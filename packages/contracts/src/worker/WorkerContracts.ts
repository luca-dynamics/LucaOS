export interface WorkerMessage {
  jobId: string;
  taskType: string;
  status: "queued" | "running" | "completed" | "failed";
  payload: Record<string, unknown>;
  result?: unknown;
  error?: string;
  timestamp: number;
}
