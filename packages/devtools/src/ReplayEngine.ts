import { RuntimeEvent, TurnSnapshot, TurnDecisionGraph } from "../../contracts/src";
import { EventBus } from "../../voice-engine/src";
import { FlightRecorderTraceEntry } from "./TraceCollector";

export class TurnSnapshotBuilder {
  public static buildFromEvents(sessionId: string, events: readonly RuntimeEvent[]): TurnSnapshot {
    const sessionEvents = events.filter((e) => e.sessionId === sessionId);

    const decisionNodes = sessionEvents.map((e) => ({
      nodeId: `node_${e.sequence}`,
      stage: e.domain.toLowerCase(),
      timestamp: e.timestamp,
      durationMs: 45,
      provider: e.domain === "LLM" ? "OpenAI Provider" : "Internal Subsystem",
      decision: e.type,
      confidence: 0.98,
      outputSummary: `Event #${e.sequence}: ${e.type}`,
    }));

    return {
      snapshotVersion: "1.2.0",
      schemaVersion: "1.2.0",
      provenance: {
        runtimeVersion: "1.0.0",
        runtimeConfigurationHash: "hash_event_sourced_100",
        featureFlags: ["event_sourcing", "actor_mailbox"],
        deviceInformation: { os: "windows", arch: "x64", sampleRateHz: 24000 },
      },
      conversation: {
        sessionId,
        conversationId: `conv_${sessionId}`,
        turnId: `turn_replay_${Date.now()}`,
        traceId: `trc_replay_${Date.now()}`,
        timestamp: Date.now(),
        userPrompt: "Replayed User Prompt from Event Log",
        assistantResponse: "Replayed Assistant Response from Event Log",
      },
      runtime: {
        stateHistory: [],
        executionMode: "REPLAY",
        connectionState: "CONNECTED",
      },
      providers: {
        stt: { provider: "Deepgram Nova-2", latencyMs: 180 },
        llm: { provider: "OpenAI GPT-4o Realtime", firstTokenMs: 210, totalTokens: 120 },
        tts: { provider: "ElevenLabs Turbo v2", startupMs: 140 },
      },
      tools: [],
      memory: {
        retrievedFactsCount: 2,
        retrievedEpisodesCount: 1,
        workingMemoryTurnsCount: 5,
      },
      worker: { activeJobs: [] },
      performance: {
        sttMs: 180,
        llmFirstTokenMs: 210,
        toolMs: 0,
        ttsStartupMs: 140,
        playbackMs: 300,
        totalTurnMs: 830,
      },
      timeline: [],
      decisionGraph: { turnId: `turn_${sessionId}`, nodes: decisionNodes },
      executionPlan: {
        planId: `plan_${sessionId}`,
        userPrompt: "Replayed User Prompt",
        budget: {
          maxLatencyMs: 1500,
          maxTokens: 4096,
          maxCost: 0.05,
          maxWorkers: 3,
          priority: "high",
          deadline: Date.now() + 1500,
        },
        dag: [
          { stepId: "step_mem_1", stepName: "Memory Retrieval", subsystem: "memory", description: "Inject facts", dependsOn: [], estimatedDurationMs: 45 },
          { stepId: "step_llm_2", stepName: "LLM Generation", subsystem: "llm", description: "Stream tokens", dependsOn: ["step_mem_1"], estimatedDurationMs: 210 },
        ],
      },
      replay: {
        pointer: `ptr_${sessionId}_${sessionEvents.length}`,
        reproducible: true,
      },
      diagnostics: {
        errors: [],
        warnings: [],
        qualityScore: 100,
      },
    };
  }
}

export class ReplayEngine {
  constructor(public targetBus?: EventBus) {}

  public replaySession(sessionId: string, events: readonly RuntimeEvent[]): TurnSnapshot {
    console.log(`🎬 [ReplayEngine] Replaying Session #${sessionId} from ${events.length} immutable events...`);
    return TurnSnapshotBuilder.buildFromEvents(sessionId, events);
  }

  public async replayTraces(traces: readonly FlightRecorderTraceEntry[], delayMs = 0): Promise<void> {
    if (!this.targetBus) return;
    for (const entry of traces) {
      this.targetBus.publish(entry.event);
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
}
