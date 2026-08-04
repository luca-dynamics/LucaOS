import { TurnContext } from "../../../../voice-engine/src";
import { SentenceBuilder } from "../SentenceBuilder";

export class SentencePlannerStage {
  private sentenceBuilder = new SentenceBuilder();

  public pushToken(ctx: TurnContext, token: string): string | null {
    ctx.cancellation.throwIfCancelled();
    return this.sentenceBuilder.pushToken(token);
  }

  public flush(ctx: TurnContext): string | null {
    ctx.cancellation.throwIfCancelled();
    return this.sentenceBuilder.flush();
  }
}
