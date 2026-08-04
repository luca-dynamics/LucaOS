import { EventBus } from "../../voice-engine/src";
import { ProviderRegistry, MemoryCoordinator } from "../../conversation-engine/src";
import { TraceCollector, TimelineStore } from "../../devtools/src";
import { LucaRuntimeProcess } from "./LucaRuntimeProcess";
import { TurnCoordinator } from "./turn/TurnCoordinator";
import { WorkerScheduler } from "./worker/WorkerScheduler";
import { SessionManager } from "./session/SessionManager";
import { EventStore } from "./events/EventStore";
import { ResourceManager } from "./resource/ResourceManager";
import { CapabilityManager } from "./security/CapabilityManager";
import { PolicyEngine } from "./policy/PolicyEngine";
import { FaultInjector } from "./resilience/FaultInjector";

export interface RuntimeKernelConfig {
  surface?: "voice_hud" | "desktop" | "mobile" | "headless";
  sessionId?: string;
}

export class RuntimeKernel {
  public eventBus: EventBus;
  public eventStore: EventStore;
  public providerRegistry: ProviderRegistry;
  public memoryCoordinator: MemoryCoordinator;
  public traceCollector: TraceCollector;
  public timelineStore: TimelineStore;
  public runtimeProcess: LucaRuntimeProcess;
  public turnCoordinator: TurnCoordinator;
  public workerScheduler: WorkerScheduler;
  public sessionManager: SessionManager;
  public resourceManager: ResourceManager;
  public capabilityManager: CapabilityManager;
  public policyEngine: PolicyEngine;
  public faultInjector: FaultInjector;

  constructor(config: RuntimeKernelConfig = {}) {
    this.runtimeProcess = new LucaRuntimeProcess();
    this.eventBus = this.runtimeProcess.eventBus;
    this.eventStore = new EventStore();
    this.memoryCoordinator = this.runtimeProcess.conversationSession.memory;
    this.providerRegistry = this.runtimeProcess.conversationSession.router.registry;
    this.traceCollector = this.runtimeProcess.traceCollector;
    this.timelineStore = this.runtimeProcess.timelineStore;

    this.turnCoordinator = new TurnCoordinator(this.runtimeProcess);
    this.workerScheduler = this.runtimeProcess.workerScheduler;
    this.sessionManager = new SessionManager(this.runtimeProcess, this.eventStore);

    this.resourceManager = new ResourceManager();
    this.capabilityManager = new CapabilityManager();
    this.policyEngine = new PolicyEngine();
    this.faultInjector = new FaultInjector();

    console.log(`🌌 [RuntimeKernel] Initialized Production Composition Root (Surface: '${config.surface || "voice_hud"}', Session: '${config.sessionId || "sess_default"}')`);
  }

  public async start(): Promise<void> {
    await this.runtimeProcess.startProcess();
    console.log("🚀 [RuntimeKernel] Platform Runtime Kernel Started Successfully!");
  }

  public stop(): void {
    this.runtimeProcess.stopProcess();
    console.log("🛑 [RuntimeKernel] Platform Runtime Kernel Stopped.");
  }
}
