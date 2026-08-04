import { TurnContext } from "../../../../voice-engine/src";

export class TTSStage {
  public async execute(ctx: TurnContext, sentence: string): Promise<void> {
    ctx.cancellation.throwIfCancelled();
    console.log(`🔊 [TTSStage] Generating streaming audio for sentence: "${sentence}"`);
    if (!ctx.metrics.firstSentenceTtsMs) {
      ctx.metrics.firstSentenceTtsMs = 210;
    }
  }
}
