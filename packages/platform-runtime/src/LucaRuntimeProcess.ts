import { EventBus, InteractionStore, InteractionState, createAssistantEvent, SystemEventType } from "../../voice-engine/src";
import { ConversationSession, ModelRouter, ProviderRegistry, MemoryCoordinator } from "../../conversation-engine/src";
import { PresenceEngine, PresenceFusionEngine, ExpressiveOrbParameters } from "../../presence-engine/src";
import { AudioPipeline, SentenceAudioQueue, ElevenLabsTTSAdapter } from "../../audio/src";
import { TraceCollector, TimelineStore } from "../../devtools/src";
import { VoiceHudPresenter } from "../../presentation/src";
import { LucaRuntimeState, InvalidTransitionError } from "../../contracts/src";
import { WorkerScheduler } from "./worker/WorkerScheduler";

export const ALLOWED_STATE_TRANSITIONS: Record<LucaRuntimeState, LucaRuntimeState[]> = {
  Idle: ["Listening", "Idle"],
  Listening: ["Understanding", "Idle"],
  Understanding: ["Thinking", "Idle"],
  Thinking: ["Acting", "Speaking", "Idle"],
  Acting: ["Speaking", "Idle"],
  Speaking: ["Recovering", "Idle"],
  Recovering: ["Idle"],
};

export class LucaRuntimeProcess {
  public eventBus: EventBus;
  public interactionStore: InteractionStore;
  public audioPipeline: AudioPipeline;
  public conversationSession: ConversationSession;
  public presenceEngine: PresenceEngine;
  public presenceFusion: PresenceFusionEngine;
  public traceCollector: TraceCollector;
  public timelineStore: TimelineStore;
  public audioQueue: SentenceAudioQueue;
  public ttsAdapter: ElevenLabsTTSAdapter;
  public workerScheduler: WorkerScheduler;
  public currentState: LucaRuntimeState = "Idle";
  private lastStateChangeTimestamp: number = Date.now();

  constructor() {
    this.eventBus = new EventBus();
    this.interactionStore = new InteractionStore(this.eventBus);
    this.audioPipeline = new AudioPipeline(this.eventBus);

    const providerRegistry = new ProviderRegistry();
    const router = new ModelRouter(providerRegistry);
    const memory = new MemoryCoordinator();

    this.conversationSession = new ConversationSession(router, memory);
    this.presenceEngine = new PresenceEngine("voice_hud");
    this.presenceFusion = new PresenceFusionEngine(this.presenceEngine);

    this.traceCollector = new TraceCollector(this.eventBus);
    this.timelineStore = new TimelineStore();

    this.audioQueue = new SentenceAudioQueue(this.eventBus);
    this.ttsAdapter = new ElevenLabsTTSAdapter(this.audioQueue);

    this.workerScheduler = new WorkerScheduler(this.eventBus);
  }

  public async startProcess(): Promise<void> {
    await this.audioPipeline.start();
  }

  // Domain Lifecycle Execution Methods (Public API Boundary)
  public beginListening(reason = "user_speech_detected"): ExpressiveOrbParameters {
    return this.transitionState("Listening", reason);
  }

  public beginUnderstanding(reason = "stt_final_transcript_received"): ExpressiveOrbParameters {
    return this.transitionState("Understanding", reason);
  }

  public beginThinking(reason = "llm_generation_started"): ExpressiveOrbParameters {
    return this.transitionState("Thinking", reason);
  }

  public beginToolExecution(reason = "tool_call_requested"): ExpressiveOrbParameters {
    return this.transitionState("Acting", reason);
  }

  public beginSpeaking(reason = "tts_audio_stream_started"): ExpressiveOrbParameters {
    return this.transitionState("Speaking", reason);
  }

  public finishTurn(reason = "playback_completed"): ExpressiveOrbParameters {
    this.transitionState("Recovering", reason);
    return this.transitionState("Idle", "turn_finished");
  }

  // Enclosed Private FSM Transition Guard
  private transitionState(newState: LucaRuntimeState, reason = "user_action"): ExpressiveOrbParameters {
    const allowed = ALLOWED_STATE_TRANSITIONS[this.currentState];
    if (!allowed || !allowed.includes(newState)) {
      throw new InvalidTransitionError(this.currentState, newState);
    }

    const previousState = this.currentState;
    const now = Date.now();
    const durationPreviousStateMs = now - this.lastStateChangeTimestamp;

    this.currentState = newState;
    this.lastStateChangeTimestamp = now;

    // Publish rich state transition event to EventBus
    const evt = createAssistantEvent(
      SystemEventType.StateReset,
      "system",
      {
        from: previousState,
        to: newState,
        reason,
        timestamp: now,
        durationPreviousStateMs,
        correlationId: `corr_${now}`,
      },
      { sessionId: "sess_runtime" }
    );
    this.eventBus.publish(evt);

    let voiceInteractionState = InteractionState.Idle;

    switch (newState) {
      case "Listening":
        voiceInteractionState = InteractionState.Listening;
        break;
      case "Understanding":
        voiceInteractionState = InteractionState.ProcessingSpeech;
        break;
      case "Thinking":
        voiceInteractionState = InteractionState.Thinking;
        break;
      case "Acting":
        voiceInteractionState = InteractionState.ToolExecution;
        break;
      case "Speaking":
        voiceInteractionState = InteractionState.Responding;
        break;
      case "Recovering":
        voiceInteractionState = InteractionState.Sleeping;
        break;
      default:
        voiceInteractionState = InteractionState.Idle;
        break;
    }

    return this.presenceEngine.express(voiceInteractionState);
  }

  public getViewModel() {
    return VoiceHudPresenter.project(this.interactionStore.getState());
  }

  public stopProcess(): void {
    this.audioPipeline.stop();
  }
}
