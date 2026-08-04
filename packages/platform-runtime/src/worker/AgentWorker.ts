import { WorkerTaskHandler } from "./WorkerRegistry";

export abstract class AgentWorker implements WorkerTaskHandler {
  public abstract taskType: string;
  public abstract name: string;
  public abstract agentRole: string;

  public async execute(payload: Record<string, unknown>): Promise<unknown> {
    console.log(`🤖 [AgentWorker:${this.agentRole}] Starting autonomous execution for task '${this.taskType}'...`);
    return this.runAgentLogic(payload);
  }

  protected abstract runAgentLogic(payload: Record<string, unknown>): Promise<unknown>;
}

export class ResearchAgentWorker extends AgentWorker {
  public taskType = "research_agent";
  public name = "Autonomous Research Agent";
  public agentRole = "Web & Documentation Researcher";

  protected async runAgentLogic(payload: Record<string, unknown>): Promise<unknown> {
    const topic = (payload.query as string) || "LucaOS System Architecture";
    console.log(`🔍 [ResearchAgentWorker] Synthesizing knowledge graph for topic: "${topic}"...`);
    await new Promise((r) => setTimeout(r, 60));
    return { topic, sourcesFound: 5, confidence: 0.98, summary: "Research findings compiled successfully." };
  }
}

export class CalendarAgentWorker extends AgentWorker {
  public taskType = "calendar_agent";
  public name = "Autonomous Calendar Agent";
  public agentRole = "Calendar & Scheduling Manager";

  protected async runAgentLogic(payload: Record<string, unknown>): Promise<unknown> {
    const title = (payload.eventTitle as string) || "Team Architecture Review";
    console.log(`📅 [CalendarAgentWorker] Scheduling event: "${title}"...`);
    await new Promise((r) => setTimeout(r, 45));
    return { eventTitle: title, scheduledTime: "Tomorrow, 2:00 PM", status: "confirmed" };
  }
}
