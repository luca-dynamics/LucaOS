import { TurnScheduler } from "../src/TurnScheduler";
import { PolicyEngine } from "../src/PolicyEngine";
import { ProviderRegistry } from "../src/providers/ProviderRegistry";
import { ModelRouter } from "../src/providers/ModelRouter";
import { ModelProvider, ModelCapability, ProviderCapabilities } from "../src/providers/ModelProvider";
import { TaskPlanner } from "../src/planner/TaskPlanner";
import { ActionGraph } from "../src/planner/ActionGraph";
import { MemoryCoordinator } from "../src/memory/MemoryCoordinator";
import { ConversationSession } from "../src/runtime/ConversationSession";
import { ToolPermissionPolicy } from "../src/tools/ToolPermissionPolicy";
import { ToolSession } from "../src/tools/ToolSession";
import { WeatherToolAdapter } from "../src/tools/WeatherToolAdapter";
import { certifyModelProvider } from "./certification/ProviderCertification";

class MockProvider implements ModelProvider {
  public id = "mock-gpt-4";
  public name = "Mock GPT-4";
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
    onToken("Hello ");
    onToken("there. ");
    onToken("Luca ");
    onToken("is ready.");
    return "Hello there. Luca is ready.";
  }

  public getHealth() {
    return "healthy" as const;
  }

  public getMetrics() {
    return { totalRequests: 10, successfulRequests: 10, failedRequests: 0, averageLatencyMs: 120 };
  }
}

export async function runConversationEngineTests(): Promise<void> {
  // Test 1: TurnScheduler
  const scheduler = new TurnScheduler();
  const handle1 = scheduler.beginTurn({ userPrompt: "Hello Luca" });
  if (handle1.status !== "active") throw new Error("TurnScheduler beginTurn failed");
  scheduler.complete(handle1.turnId);

  // Test 2: PolicyEngine
  const policy = new PolicyEngine();
  if (!policy.shouldInvokeTools("Please search the web")) throw new Error("PolicyEngine shouldInvokeTools failed");

  // Test 3: ModelRouter & Provider Certification
  const registry = new ProviderRegistry();
  const provider = new MockProvider();
  
  const certResult = await certifyModelProvider(provider);
  if (!certResult.passed) {
    throw new Error(`ProviderCertification failed for ${provider.id}`);
  }

  registry.register(provider);
  const router = new ModelRouter(registry);
  const selected = router.selectProvider({ requiredCapabilities: [ModelCapability.Streaming] });
  if (selected.id !== "mock-gpt-4") throw new Error("ModelRouter selectProvider failed");

  // Test 4: TaskPlanner & ActionGraph
  const planner = new TaskPlanner();
  const plan = planner.plan("Search system stats");
  if (plan.steps.length !== 4) throw new Error("TaskPlanner plan failed");

  // Test 5: MemoryCoordinator
  const memory = new MemoryCoordinator();
  memory.semanticMemory.setFact("user_name", "Luca User", "fact");
  memory.recordTurn({ turnId: "t1", userPrompt: "Remember my name is Luca", timestamp: Date.now() });
  const context = memory.buildContext("What is my name?");
  if (context.retrievedFacts.length !== 1 || context.retrievedEpisodes.length !== 1) {
    throw new Error("MemoryCoordinator buildContext failed");
  }

  // Test 6: ConversationSession & SentenceBuilder Stream
  const session = new ConversationSession(router, memory);
  const sentences: string[] = [];
  await session.executeTurn("Hello Luca", {
    onPartialToken: () => {},
    onSentenceComplete: (s) => sentences.push(s),
    onCompleted: () => {},
    onError: () => {},
  });

  if (sentences.length !== 2) {
    throw new Error(`ConversationSession SentenceBuilder failed: expected 2 sentences, got ${sentences.length}`);
  }

  // Test 7: ToolSession & WeatherToolAdapter Execution
  const toolPolicy = new ToolPermissionPolicy();
  const toolSession = new ToolSession("weather_lookup", toolPolicy);
  let progressPushed = false;

  const weatherRes = await toolSession.execute(
    { city: "Abuja" },
    async (args) => WeatherToolAdapter.executeLookup(args.city as string),
    {
      onApprovalRequested: async () => true,
      onProgress: () => { progressPushed = true; },
      onCompleted: () => {},
      onError: () => {},
    }
  );

  if (!weatherRes || !progressPushed) {
    throw new Error("ToolSession & WeatherToolAdapter test failed");
  }

  const graph = new ActionGraph();
  const res = await graph.execute(plan, async () => "ok");
  if (!res.success) throw new Error("ActionGraph execution failed");

  console.log("✅ All @luca/conversation-engine ToolSession Tests Passed Successfully!");
}

runConversationEngineTests();
