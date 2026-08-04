import { TurnContext } from "../../../../voice-engine/src";
import { TurnCompletionPredictor } from "../../../../platform-runtime/src";

export class TurnCompletionStage {
  private predictor = new TurnCompletionPredictor();

  public execute(ctx: TurnContext): boolean {
    ctx.cancellation.throwIfCancelled();
    const result = this.predictor.predict({
      vadEnergy: 0.1,
      silenceDurationMs: 450,
      transcript: ctx.userTranscript,
      isFinalTranscript: true,
      sttConfidence: 0.98,
    });
    console.log(`🎯 [TurnCompletionStage] Predictor Decision: ${result.decision} (Reason: ${result.reason})`);
    return result.decision === "COMPLETE";
  }
}
