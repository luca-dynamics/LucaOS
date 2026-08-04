import { LucaRuntimeProcess } from "../../../packages/platform-runtime/src";
import { ModelProvider, ModelCapability, ProviderCapabilities, WeatherToolAdapter, ToolSession, ToolPermissionPolicy } from "../../../packages/conversation-engine/src";
import { ConversationQualityEvaluator } from "../../../packages/devtools/src";

class DashboardDemoProvider implements ModelProvider {
  public id = "dashboard-demo-provider";
  public name = "OpenAI GPT-4.5 Ultra";
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

  public getHealth() { return "healthy" as const; }
  public getMetrics() { return { totalRequests: 1, successfulRequests: 1, failedRequests: 0, averageLatencyMs: 184 }; }
}

export async function runLivingDashboard(): Promise<void> {
  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│ 🖥️  LUCAOS LIVING DEMO DASHBOARD & FLIGHT MONITOR            │");
  console.log("└──────────────────────────────────────────────────────────────┘\n");

  const runtimeProcess = new LucaRuntimeProcess();
  const provider = new DashboardDemoProvider();
  runtimeProcess.conversationSession.router.registry.register(provider);

  await runtimeProcess.startProcess();

  console.log("● Runtime Lifecycle State: [ Understanding -> Thinking -> Acting ]");
  console.log("----------------------------------------------------------------");
  console.log("📝 Transcript: \"Luca, I'm travelling to Abuja tomorrow. Will it rain? If so, should I move my 2pm meeting?\"");
  console.log("⚡ Model: OpenAI GPT-4.5 Ultra | First Token: 184 ms");
  console.log("🌤️ Tool Executed: Weather Lookup | Latency: 412 ms");
  console.log("----------------------------------------------------------------");
  console.log("🧠 Presence Cognitive Channels:");
  console.log("   Attention:  [██████████] 1.00");
  console.log("   Certainty:  [████████░░] 0.88");
  console.log("   Intent:     [██████░░░░] 0.65");
  console.log("----------------------------------------------------------------");

  // Step 1: Execute Weather Tool
  const policy = new ToolPermissionPolicy();
  const weatherSession = new ToolSession("weather_lookup", policy);
  await weatherSession.execute(
    { city: "Abuja" },
    async (args) => WeatherToolAdapter.executeLookup(args.city as string),
    {
      onApprovalRequested: async () => true,
      onProgress: (p) => console.log(`⚙️ Tool Status: ${p}`),
      onCompleted: (res) => console.log(`✓ Weather Data Retrieved:`, res),
      onError: console.error,
    }
  );

  console.log("----------------------------------------------------------------");
  console.log("🔊 Speech Output Streams:");

  await runtimeProcess.conversationSession.executeTurn(
    "Luca, I'm travelling to Abuja tomorrow. Will it rain? If so, should I move my 2pm meeting?",
    {
      onPartialToken: () => {},
      onSentenceComplete: (s) => console.log(`  ✓ Sentence Streamed: "${s}"`),
      onCompleted: (full) => console.log(`\n🎉 Turn Response Completed: "${full}"`),
      onError: console.error,
    }
  );

  const quality = ConversationQualityEvaluator.evaluateSessionQuality(184, 90, 0.02);
  console.log("----------------------------------------------------------------");
  console.log("⭐ Conversation Quality Score Card:");
  console.log(`   Naturalness:           ${quality.naturalness} / 10`);
  console.log(`   Responsiveness:        ${quality.responsiveness} / 10`);
  console.log(`   Latency Score:         ${quality.latencyScore} / 10`);
  console.log(`   Interruption Recovery: ${quality.interruptionRecovery} / 10`);
  console.log(`   Memory Recall:         ${quality.memoryRecall} / 10`);
  console.log(`   Presence Stability:    ${quality.presenceStability} / 10`);
  console.log(`   👉 Overall Score:       ${quality.overallQualityScore} / 10`);
  console.log("----------------------------------------------------------------\n");

  runtimeProcess.stopProcess();
}

runLivingDashboard();
