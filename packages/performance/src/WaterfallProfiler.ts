export type StageName =
  | "mic_open"
  | "speech_start"
  | "first_transcript"
  | "final_transcript"
  | "first_llm_token"
  | "tool_start"
  | "tool_end"
  | "first_tts_byte"
  | "playback_start"
  | "playback_finish"
  | "idle";

export interface StageTimestamp {
  stage: StageName;
  timestampMs: number;
}

export interface TurnPerformanceReport {
  sessionId: string;
  conversationId: string;
  turnId: string;
  traceId: string;
  stageId: string;

  build: {
    lucaVersion: string;
    gitCommit: string;
    buildTimestamp: string;
    providers: {
      openaiSdk: string;
      elevenlabsSdk: string;
      deepgramSdk?: string;
    };
  };

  provider: {
    llm: string;
    stt: string;
    tts: string;
    tool?: string;
  };

  timestamps: Record<StageName, number>;

  durations: {
    sttMs: number;
    llmFirstTokenMs: number;
    toolMs: number;
    ttsStartupMs: number;
    playbackMs: number;
    totalTurnMs: number;
  };

  outcome: {
    completed: boolean;
    interrupted: boolean;
    cancelled: boolean;
    failed: boolean;
    failureReason?: string;
  };
}

export interface PercentileStats {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
}

export class WaterfallProfiler {
  private stageHistory: Map<StageName, number[]> = new Map();
  private currentTurnStages: StageTimestamp[] = [];

  public markStage(stage: StageName): void {
    const now = Date.now();
    this.currentTurnStages.push({ stage, timestampMs: now });
  }

  public generateTurnReport(
    sessionId: string,
    conversationId: string,
    turnId: string,
    traceId: string,
    stageId: string,
    provider: { llm: string; stt: string; tts: string; tool?: string },
    outcome: { completed: boolean; interrupted: boolean; cancelled: boolean; failed: boolean; failureReason?: string }
  ): TurnPerformanceReport {
    const timestamps: Partial<Record<StageName, number>> = {};
    const buildInfo = {
      lucaVersion: "0.7.0-alpha",
      gitCommit: "HEAD",
      buildTimestamp: new Date().toISOString(),
      providers: {
        openaiSdk: "4.86.0",
        elevenlabsSdk: "1.50.0",
        deepgramSdk: "3.9.0",
      },
    };

    if (this.currentTurnStages.length === 0) {
      return {
        sessionId,
        conversationId,
        turnId,
        traceId,
        stageId,
        build: buildInfo,
        provider,
        timestamps: {} as Record<StageName, number>,
        durations: { sttMs: 0, llmFirstTokenMs: 0, toolMs: 0, ttsStartupMs: 0, playbackMs: 0, totalTurnMs: 0 },
        outcome,
      };
    }

    const baseTime = this.currentTurnStages[0].timestampMs;
    for (const item of this.currentTurnStages) {
      const delta = item.timestampMs - baseTime;
      timestamps[item.stage] = delta;

      if (!this.stageHistory.has(item.stage)) {
        this.stageHistory.set(item.stage, []);
      }
      this.stageHistory.get(item.stage)!.push(delta);
    }

    const getTs = (s: StageName) => timestamps[s] || 0;

    const report: TurnPerformanceReport = {
      sessionId,
      conversationId,
      turnId,
      traceId,
      stageId,
      build: buildInfo,
      provider,
      timestamps: timestamps as Record<StageName, number>,
      durations: {
        sttMs: getTs("final_transcript") - getTs("speech_start"),
        llmFirstTokenMs: getTs("first_llm_token") - getTs("final_transcript"),
        toolMs: getTs("tool_end") - getTs("tool_start"),
        ttsStartupMs: getTs("first_tts_byte") - getTs("first_llm_token"),
        playbackMs: getTs("playback_finish") - getTs("playback_start"),
        totalTurnMs: getTs("idle") - getTs("mic_open"),
      },
      outcome,
    };

    this.currentTurnStages = [];
    return report;
  }

  public getStagePercentiles(stage: StageName): PercentileStats {
    const samples = [...(this.stageHistory.get(stage) || [0])].sort((a, b) => a - b);
    const count = samples.length;
    const mean = count > 0 ? samples.reduce((a, b) => a + b, 0) / count : 0;
    const p50 = count > 0 ? samples[Math.floor(count * 0.5)] : 0;
    const p90 = count > 0 ? samples[Math.floor(count * 0.9)] : 0;
    const p95 = count > 0 ? samples[Math.floor(count * 0.95)] : 0;
    const p99 = count > 0 ? samples[Math.floor(count * 0.99)] : 0;

    return { p50, p90, p95, p99, mean };
  }
}
