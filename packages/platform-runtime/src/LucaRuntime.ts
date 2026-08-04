import { EventBus, InteractionStore, RuntimeManager, ConversationOrchestrator } from "../../voice-engine/src";
import { TurnScheduler, ModelRouter, MemoryCoordinator } from "../../conversation-engine/src";
import { VoiceHudPresenter, VoiceHudViewModel } from "../../presentation/src";
import { HealthMonitor, PlatformHealthReport } from "./HealthMonitor";
import { ServiceRegistry } from "./ServiceRegistry";

export class LucaRuntime {
  public eventBus: EventBus;
  public interactionStore: InteractionStore;
  public runtimeManager: RuntimeManager;
  public orchestrator: ConversationOrchestrator;
  public turnScheduler: TurnScheduler;
  public modelRouter: ModelRouter;
  public memoryCoordinator: MemoryCoordinator;
  public healthMonitor: HealthMonitor;
  public registry: ServiceRegistry;

  constructor(deps: {
    eventBus: EventBus;
    interactionStore: InteractionStore;
    runtimeManager: RuntimeManager;
    orchestrator: ConversationOrchestrator;
    turnScheduler: TurnScheduler;
    modelRouter: ModelRouter;
    memoryCoordinator: MemoryCoordinator;
    healthMonitor: HealthMonitor;
    registry: ServiceRegistry;
  }) {
    this.eventBus = deps.eventBus;
    this.interactionStore = deps.interactionStore;
    this.runtimeManager = deps.runtimeManager;
    this.orchestrator = deps.orchestrator;
    this.turnScheduler = deps.turnScheduler;
    this.modelRouter = deps.modelRouter;
    this.memoryCoordinator = deps.memoryCoordinator;
    this.healthMonitor = deps.healthMonitor;
    this.registry = deps.registry;
  }

  public async start(): Promise<void> {
    await this.runtimeManager.startAll();
  }

  public async stop(): Promise<void> {
    await this.runtimeManager.stopAll();
  }

  public getVoiceHudViewModel(): VoiceHudViewModel {
    return VoiceHudPresenter.project(this.interactionStore.getState());
  }

  public getHealth(): PlatformHealthReport {
    return this.healthMonitor.getHealth();
  }
}
