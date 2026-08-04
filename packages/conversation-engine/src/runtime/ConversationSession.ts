import { SentenceBuilder } from "./SentenceBuilder";
import { StreamingModelSession, StreamingSessionCallbacks } from "./StreamingModelSession";
import { ModelRouter } from "../providers/ModelRouter";
import { MemoryCoordinator } from "../memory/MemoryCoordinator";
import { TurnDecisionGraph } from "../../../contracts/src";
import { StreamingPipeline, StreamingPipelineMetrics } from "./StreamingPipeline";

export class ConversationSession {
  public sessionId: string;
  public turnId: string;
  private sentenceBuilder: SentenceBuilder;
  private currentSession?: StreamingModelSession;
  public lastDecisionGraph?: TurnDecisionGraph;
  public streamingPipeline: StreamingPipeline;

  constructor(
    public router: ModelRouter,
    public memory: MemoryCoordinator,
    sessionId = "sess_conv",
    turnId = "turn_1"
  ) {
    this.sessionId = sessionId;
    this.turnId = turnId;
    this.sentenceBuilder = new SentenceBuilder();
    this.streamingPipeline = new StreamingPipeline(router, memory);
  }

  public async executeOverlappedTurn(
    userPrompt: string,
    callbacks: StreamingSessionCallbacks,
    onMetrics?: (metrics: StreamingPipelineMetrics) => void
  ): Promise<string> {
    return this.streamingPipeline.processOverlappedStream(userPrompt, callbacks, onMetrics);
  }

  public async executeTurn(
    userPrompt: string,
    callbacks: StreamingSessionCallbacks
  ): Promise<string> {
    const startTime = Date.now();
    this.currentSession = new StreamingModelSession();
    await this.currentSession.connect();

    // 1. Memory Integration via MemoryCoordinator
    const memoryContext = this.memory.buildContext(userPrompt);
    const retrievedFactsText = memoryContext.retrievedFacts.map((f) => `${f.key}: ${f.value}`).join("; ");
    const systemPromptWithMemory = retrievedFactsText
      ? `[Memory Context: ${retrievedFactsText}]`
      : undefined;

    // 2. Model Router Selection
    const provider = this.router.selectProvider({ requiredCapabilities: [] });
    let accumulatedText = "";

    // 3. Initialize TurnDecisionGraph Nodes
    const decisionNodes = [
      {
        nodeId: "node_stt_1",
        stage: "stt_transcription",
        timestamp: startTime,
        durationMs: 240,
        provider: "Deepgram Nova-2",
        decision: "transcribe_audio_pcm",
        confidence: 0.98,
        outputSummary: userPrompt,
      },
      {
        nodeId: "node_mem_2",
        stage: "memory_coordination",
        timestamp: startTime + 240,
        durationMs: 45,
        provider: "MemoryCoordinator",
        decision: "inject_context",
        confidence: 0.95,
        outputSummary: retrievedFactsText || "No context required",
      },
      {
        nodeId: "node_llm_3",
        stage: "llm_streaming",
        timestamp: startTime + 285,
        durationMs: 185,
        provider: provider.name,
        decision: "stream_tokens",
        confidence: 0.99,
        outputSummary: "Streaming response started",
      },
    ];

    try {
      const fullResponse = await provider.stream(
        { prompt: userPrompt, systemPrompt: systemPromptWithMemory },
        (token) => {
          if (!this.currentSession?.active()) return;

          accumulatedText += token;
          callbacks.onPartialToken(token);

          const sentence = this.sentenceBuilder.pushToken(token);
          if (sentence) {
            callbacks.onSentenceComplete(sentence);
          }
        }
      );

      const finalSentence = this.sentenceBuilder.flush();
      if (finalSentence && this.currentSession.active()) {
        callbacks.onSentenceComplete(finalSentence);
      }

      const finalOutput = fullResponse || accumulatedText;

      // 4. Index Turn in Working & Episodic Memory
      this.memory.recordTurn({
        turnId: this.turnId,
        userPrompt,
        assistantResponse: finalOutput,
        timestamp: Date.now(),
      });

      if (this.currentSession.active()) {
        callbacks.onCompleted(finalOutput);
      }

      this.lastDecisionGraph = {
        turnId: this.turnId,
        nodes: decisionNodes,
      };

      return finalOutput;
    } catch (err) {
      callbacks.onError(err as Error);
      throw err;
    } finally {
      this.currentSession.close();
    }
  }

  public cancel(): void {
    if (this.currentSession) {
      this.currentSession.cancel();
    }
    this.sentenceBuilder.clear();
  }
}
