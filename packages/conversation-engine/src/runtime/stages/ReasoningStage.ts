import { TurnContext } from "../../../../voice-engine/src";
import { ModelRouter } from "../../providers/ModelRouter";
import { MemoryCoordinator } from "../../memory/MemoryCoordinator";

export class ReasoningStage {
  constructor(public router: ModelRouter, public memory: MemoryCoordinator) {}

  public async execute(ctx: TurnContext, onToken: (tok: string) => void): Promise<string> {
    ctx.cancellation.throwIfCancelled();

    const memCtx = this.memory.buildContext(ctx.userTranscript);
    ctx.memoryContextText = memCtx.retrievedFacts.map((f) => `${f.key}: ${f.value}`).join("; ");

    const provider = this.router.selectProvider({ requiredCapabilities: [] });
    const startTime = Date.now();

    const text = await provider.stream(
      { prompt: ctx.userTranscript, systemPrompt: ctx.memoryContextText ? `[Memory: ${ctx.memoryContextText}]` : undefined },
      (token) => {
        ctx.cancellation.throwIfCancelled();
        if (!ctx.metrics.llmFirstTokenMs) {
          ctx.metrics.llmFirstTokenMs = Date.now() - startTime;
        }
        onToken(token);
      }
    );

    ctx.assistantTranscript = text;
    return text;
  }
}
