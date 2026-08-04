import { TurnContext } from "../../../../voice-engine/src";

export class PlaybackStage {
  public async play(ctx: TurnContext): Promise<void> {
    ctx.cancellation.throwIfCancelled();
    console.log(`▶️ [PlaybackStage] Playing audio stream for Session #${ctx.sessionId}...`);
  }
}
