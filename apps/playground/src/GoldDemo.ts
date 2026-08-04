import { LucaRuntimeProcess } from "../../../packages/platform-runtime/src";
import { ModelProvider, ModelCapability, ProviderCapabilities, WeatherToolAdapter, ToolSession, ToolPermissionPolicy } from "../../../packages/conversation-engine/src";

class GoldDemoProvider implements ModelProvider {
  public id = "gold-demo-provider";
  public name = "Gold Demo AI Provider";
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
    onToken("I checked ");
    onToken("Abuja's forecast; ");
    onToken("heavy rain is expected. ");
    onToken("I recommend ");
    onToken("rescheduling your ");
    onToken("2 PM meeting ");
    onToken("to Friday.");
    return "I checked Abuja's forecast; heavy rain is expected. I recommend rescheduling your 2 PM meeting to Friday.";
  }

  public getHealth() {
    return "healthy" as const;
  }

  public getMetrics() {
    return { totalRequests: 1, successfulRequests: 1, failedRequests: 0, averageLatencyMs: 65 };
  }
}

export async function runGoldDemo(): Promise<void> {
  console.log("🌟 ====================================================== 🌟");
  console.log("🏆 STARTING LUCAOS GOLD DEMO: ABUJA WEATHER + CALENDAR 🏆");
  console.log("🌟 ====================================================== 🌟\n");

  const runtimeProcess = new LucaRuntimeProcess();
  const provider = new GoldDemoProvider();
  runtimeProcess.conversationSession.router.registry.register(provider);

  await runtimeProcess.startProcess();
  console.log("⚡ Booting Lifecycle State: 'Idle' -> 'Listening'");

  // Step 1: Execute Weather Tool Session with explicit offline harness fallback allowed
  const policy = new ToolPermissionPolicy();
  const weatherSession = new ToolSession("weather_lookup", policy);
  await weatherSession.execute(
    { city: "Abuja" },
    async (args) => WeatherToolAdapter.executeLookup(args.city as string, policy, true),
    {
      onApprovalRequested: async () => true,
      onProgress: (p) => console.log(`🌤️ Tool Progress: ${p}`),
      onCompleted: (res) => console.log(`✅ Weather Data:`, res),
      onError: console.error,
    }
  );

  // Step 2: Execute Streamed Response
  console.log("\n🎙️ User Prompt: \"Luca, I'm travelling to Abuja tomorrow. Will it rain? If so, should I move my 2pm meeting?\"");
  await runtimeProcess.conversationSession.executeTurn(
    "Luca, I'm travelling to Abuja tomorrow. Will it rain? If so, should I move my 2pm meeting?",
    {
      onPartialToken: (tok) => { globalThis.process.stdout?.write?.(tok); },
      onSentenceComplete: (s) => console.log(`\n💬 Sentence Streamed to TTS: "${s}"`),
      onCompleted: (full) => console.log(`\n🎉 Final Turn Answer: "${full}"`),
      onError: console.error,
    }
  );

  runtimeProcess.stopProcess();
  console.log("\n🌟 ====================================================== 🌟");
  console.log("✅ LUCAOS GOLD DEMO COMPLETED SUCCESSFULLY WITH 0 ERRORS!");
  console.log("🌟 ====================================================== 🌟\n");
}

runGoldDemo();
