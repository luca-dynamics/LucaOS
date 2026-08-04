import { EventBus, InteractionStore, RuntimeManager, AudioRuntime, LLMRuntime, ToolRuntime, ConversationOrchestrator, EventProducingRuntime } from "../../voice-engine/src";
import { TurnScheduler, ProviderRegistry, ModelRouter, MemoryCoordinator } from "../../conversation-engine/src";
import { createDefaultLucaConfig, LucaConfig } from "../../config/src";
import { LucaRuntime } from "./LucaRuntime";
import { HealthMonitor } from "./HealthMonitor";
import { ServiceRegistry } from "./ServiceRegistry";

export class RuntimeBuilder {
  private registry = new ServiceRegistry();
  private customAudioRuntime?: EventProducingRuntime;
  private customLlmRuntime?: EventProducingRuntime;
  private customToolRuntime?: EventProducingRuntime;
  private config: LucaConfig = createDefaultLucaConfig();

  public withAudio(runtime: EventProducingRuntime): this {
    this.customAudioRuntime = runtime;
    return this;
  }

  public withLLM(runtime: EventProducingRuntime): this {
    this.customLlmRuntime = runtime;
    return this;
  }

  public withTool(runtime: EventProducingRuntime): this {
    this.customToolRuntime = runtime;
    return this;
  }

  public withConfig(config: LucaConfig): this {
    this.config = config;
    return this;
  }

  public build(): LucaRuntime {
    const eventBus = new EventBus();
    const interactionStore = new InteractionStore(eventBus);
    const runtimeManager = new RuntimeManager(eventBus);

    // Register Headless Runtimes
    const audioRuntime = this.customAudioRuntime || new AudioRuntime();
    const llmRuntime = this.customLlmRuntime || new LLMRuntime();
    const toolRuntime = this.customToolRuntime || new ToolRuntime();

    runtimeManager.register(audioRuntime);
    runtimeManager.register(llmRuntime);
    runtimeManager.register(toolRuntime);

    // Conversation Engine Subsystems
    const orchestrator = new ConversationOrchestrator(eventBus);
    const turnScheduler = new TurnScheduler();
    const providerRegistry = new ProviderRegistry();
    const modelRouter = new ModelRouter(providerRegistry);
    const memoryCoordinator = new MemoryCoordinator();
    const healthMonitor = new HealthMonitor(runtimeManager);

    this.registry.register("config", this.config);
    this.registry.register("eventBus", eventBus);
    this.registry.register("interactionStore", interactionStore);
    this.registry.register("runtimeManager", runtimeManager);
    this.registry.register("orchestrator", orchestrator);
    this.registry.register("turnScheduler", turnScheduler);
    this.registry.register("modelRouter", modelRouter);
    this.registry.register("memoryCoordinator", memoryCoordinator);

    return new LucaRuntime({
      eventBus,
      interactionStore,
      runtimeManager,
      orchestrator,
      turnScheduler,
      modelRouter,
      memoryCoordinator,
      healthMonitor,
      registry: this.registry,
    });
  }
}

export function createLucaRuntime(): LucaRuntime {
  return new RuntimeBuilder().build();
}
