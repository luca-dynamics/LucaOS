import { LucaRuntimeProcess } from "../../../packages/platform-runtime/src";
import { ModelProvider, ModelCapability, ProviderCapabilities } from "../../../packages/conversation-engine/src";

class PlaygroundMockProvider implements ModelProvider {
  public id = "playground-gpt-4";
  public name = "Playground GPT-4";
  public capabilities = [ModelCapability.Streaming, ModelCapability.ToolCalling, ModelCapability.FastLatency];
  public detailedCapabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    audioInput: true,
    audioOutput: true,
    jsonMode: true,
    reasoning: true,
    maxContextTokens: 128000,
    supportsCancellation: true,
  };
  public contextWindowTokens = 128000;

  public async invoke(): Promise<string> {
    return "Mock response";
  }

  public async stream(_opts: unknown, onToken: (t: string) => void): Promise<string> {
    onToken("Yes, ");
    onToken("it is expected ");
    onToken("to rain in Abuja ");
    onToken("tomorrow afternoon.");
    return "Yes, it is expected to rain in Abuja tomorrow afternoon.";
  }

  public getHealth() {
    return "healthy" as const;
  }

  public getMetrics() {
    return { totalRequests: 1, successfulRequests: 1, failedRequests: 0, averageLatencyMs: 80 };
  }
}

export async function bootPlayground(): Promise<void> {
  console.log("🚀 Booting LucaOS Executable Playground Process...");
  const runtimeProcess = new LucaRuntimeProcess();

  // Register Playground Model Provider
  const provider = new PlaygroundMockProvider();
  runtimeProcess.conversationSession.router.registry.register(provider);

  await runtimeProcess.startProcess();
  const vm = runtimeProcess.getViewModel();

  console.log(`✅ LucaOS Process Booted Successfully! State: '${vm.interactionState}'`);
  console.log("🎙️ Live Audio Stream Active | Flight Recorder Listening...");

  // Simulate Flagship Abuja Weather Scenario turn
  await runtimeProcess.conversationSession.executeTurn(
    "Luca, I'm visiting Abuja tomorrow. Should I carry an umbrella?",
    {
      onPartialToken: (tok: string) => { globalThis.process.stdout?.write?.(tok); },
      onSentenceComplete: (s: string) => console.log(`\n💬 Sentence Stream: "${s}"`),
      onCompleted: (text: string) => console.log(`\n🎉 Turn Completed: "${text}"`),
      onError: (err: Error) => console.error("❌ Process Error:", err),
    }
  );

  await new Promise((resolve) => setTimeout(resolve, 300));
  runtimeProcess.stopProcess();
  console.log("\n👋 Playground Process Shutdown Gracefully.");
}

bootPlayground();
