import { LucaRuntimeProcess } from "../LucaRuntimeProcess";
import { TurnCompletionPredictor, TurnPredictionSignal, TurnPredictionResult } from "./TurnCompletionPredictor";
import { StreamingSessionCallbacks, StreamingPipelineMetrics } from "../../../conversation-engine/src";
import { ExpressiveOrbParameters } from "../../../presence-engine/src";

export class TurnCoordinator {
  public predictor: TurnCompletionPredictor;

  constructor(public runtimeProcess: LucaRuntimeProcess) {
    this.predictor = new TurnCompletionPredictor();
  }

  public evaluateSpeechTurn(signal: TurnPredictionSignal): TurnPredictionResult {
    return this.predictor.predict(signal);
  }

  public async executeStreamingTurnPlan(
    userPrompt: string,
    callbacks: StreamingSessionCallbacks,
    onMetrics?: (metrics: StreamingPipelineMetrics) => void
  ): Promise<string> {
    this.runtimeProcess.beginListening();
    this.runtimeProcess.beginUnderstanding();
    this.runtimeProcess.beginThinking();

    const response = await this.runtimeProcess.conversationSession.executeOverlappedTurn(
      userPrompt,
      callbacks,
      onMetrics
    );

    this.runtimeProcess.beginSpeaking();
    this.runtimeProcess.finishTurn();

    return response;
  }

  public async executeTurnPlan(
    userPrompt: string,
    callbacks: StreamingSessionCallbacks
  ): Promise<string> {
    this.runtimeProcess.beginListening();
    this.runtimeProcess.beginUnderstanding();
    this.runtimeProcess.beginThinking();

    const response = await this.runtimeProcess.conversationSession.executeTurn(
      userPrompt,
      callbacks
    );

    this.runtimeProcess.beginSpeaking();
    this.runtimeProcess.finishTurn();

    return response;
  }
}
