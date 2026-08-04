import { LucaRuntimeProcess } from "../../platform-runtime/src";
import { ModelProvider, ModelCapability, ProviderCapabilities } from "../../conversation-engine/src";

class StressTestProvider implements ModelProvider {
  public id = "stress-provider";
  public name = "Stress Provider";
  public capabilities = [ModelCapability.Streaming, ModelCapability.FastLatency];
  public detailedCapabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: false,
    vision: false,
    audioInput: true,
    audioOutput: true,
    jsonMode: true,
    reasoning: false,
    maxContextTokens: 128000,
    supportsCancellation: true,
  };
  public contextWindowTokens = 128000;

  public async invoke(): Promise<string> {
    return "Stress turn response";
  }

  public async stream(_opts: unknown, onToken: (t: string) => void): Promise<string> {
    onToken("Stress ");
    onToken("response ");
    onToken("token.");
    return "Stress response token.";
  }

  public getHealth() { return "healthy" as const; }
  public getMetrics() { return { totalRequests: 100, successfulRequests: 100, failedRequests: 0, averageLatencyMs: 15 }; }
}

export class RuntimeStressSuite {
  public static async executeStressTest(turnCount = 100): Promise<{ passed: boolean; turnsExecuted: number; errors: Error[] }> {
    const process = new LucaRuntimeProcess();
    const provider = new StressTestProvider();
    process.conversationSession.router.registry.register(provider);
    await process.startProcess();

    const errors: Error[] = [];
    let turnsExecuted = 0;

    for (let i = 0; i < turnCount; i++) {
      try {
        await process.conversationSession.executeTurn(`Stress turn ${i + 1}`, {
          onPartialToken: () => {},
          onSentenceComplete: () => {},
          onCompleted: () => { turnsExecuted++; },
          onError: (err) => { errors.push(err); },
        });
      } catch (err) {
        errors.push(err as Error);
      }
    }

    process.stopProcess();
    return { passed: errors.length === 0 && turnsExecuted === turnCount, turnsExecuted, errors };
  }
}
