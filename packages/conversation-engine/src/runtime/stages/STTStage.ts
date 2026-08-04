import { TurnContext } from "../../../../voice-engine/src";

export class STTStage {
  public async execute(ctx: TurnContext, audioBuffer?: ArrayBuffer): Promise<void> {
    ctx.cancellation.throwIfCancelled();
    console.log(`🎙️ [STTStage] Processing audio buffer (${audioBuffer ? audioBuffer.byteLength : 0} bytes)...`);
    ctx.metrics.sttPartialMs = 180;
  }
}
