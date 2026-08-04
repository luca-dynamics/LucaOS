import { TurnContext, createTurnContext } from "../../../voice-engine/src";
import { StreamingSessionCallbacks } from "./StreamingModelSession";
import { ModelRouter } from "../providers/ModelRouter";
import { MemoryCoordinator } from "../memory/MemoryCoordinator";
import { STTStage } from "./stages/STTStage";
import { TurnCompletionStage } from "./stages/TurnCompletionStage";
import { ReasoningStage } from "./stages/ReasoningStage";
import { SentencePlannerStage } from "./stages/SentencePlannerStage";
import { TTSStage } from "./stages/TTSStage";
import { PlaybackStage } from "./stages/PlaybackStage";

export interface StreamingPipelineMetrics {
  sttPartialMs: number;
  llmFirstTokenMs: number;
  firstSentenceTtsMs: number;
  totalTurnMs: number;
}

export class StreamingPipeline {
  public sttStage = new STTStage();
  public turnCompletionStage = new TurnCompletionStage();
  public reasoningStage: ReasoningStage;
  public sentencePlannerStage = new SentencePlannerStage();
  public ttsStage = new TTSStage();
  public playbackStage = new PlaybackStage();

  constructor(public router: ModelRouter, public memory: MemoryCoordinator) {
    this.reasoningStage = new ReasoningStage(router, memory);
  }

  public async processOverlappedStream(
    userPrompt: string,
    callbacks: StreamingSessionCallbacks,
    onMetrics?: (metrics: StreamingPipelineMetrics) => void,
    existingContext?: TurnContext
  ): Promise<string> {
    const ctx = existingContext || createTurnContext();
    ctx.userTranscript = userPrompt;
    const startTime = Date.now();

    try {
      // Stage 1: STT Stage
      await this.sttStage.execute(ctx);

      // Stage 2: Turn Completion Stage
      const isComplete = this.turnCompletionStage.execute(ctx);
      if (!isComplete) {
        console.log("⏳ [StreamingPipeline] Turn predictor requested holding & listening...");
      }

      // Stage 3: Reasoning Stage & Stage 4: Sentence Planner Stage
      const text = await this.reasoningStage.execute(ctx, (token) => {
        callbacks.onPartialToken(token);
        const sentence = this.sentencePlannerStage.pushToken(ctx, token);
        if (sentence) {
          // Stage 5: TTS Stage
          this.ttsStage.execute(ctx, sentence).catch(() => {});
          callbacks.onSentenceComplete(sentence);
        }
      });

      const finalSentence = this.sentencePlannerStage.flush(ctx);
      if (finalSentence) {
        await this.ttsStage.execute(ctx, finalSentence);
        callbacks.onSentenceComplete(finalSentence);
      }

      // Stage 6: Playback Stage
      await this.playbackStage.play(ctx);
      callbacks.onCompleted(text);

      ctx.metrics.totalTurnMs = Date.now() - startTime;
      if (onMetrics) {
        onMetrics(ctx.metrics);
      }

      return text;
    } catch (err) {
      callbacks.onError(err as Error);
      throw err;
    }
  }
}
