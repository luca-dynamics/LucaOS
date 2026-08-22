import { creditService } from "../creditService";
import { harnessService } from "../harnessService";
import { thoughtStreamService } from "../thoughtStreamService";
import { cognitiveDeliberator } from "../cognitiveDeliberator";
import { StreamingToolExecutor } from "../streamingToolExecutor";
import { lucaService } from "../lucaService";
import { sessionLease } from "../session/sessionLease";
import { sessionTranscript } from "../session/sessionTranscript";
import type { LLMProvider } from "../llm/LLMProvider";
import {
  compactHistory,
  contextWindowFor,
  estimateHistoryTokens,
  extractPriorSummary,
  needsCompaction,
} from "./contextCompactor";

// Ceiling on how many times one turn may hand tool results back to the model.
// Without it a model that keeps retrying a failing tool never returns, and the
// only escape is the user aborting — after the API calls have been paid for.
export const MAX_TOOL_ROUNDS = 10;

/**
 * Per-turn compaction bookkeeping. Lives on the stack of a single turn rather
 * than on the runner (which is a singleton), so one turn's failed attempt can
 * never suppress compaction on the next.
 */
interface CompactionState {
  lastAttemptedLength: number;
}

export interface RunStreamTurnOptions {
  message: string;
  imageBase64: string | null;
  onChunk: (chunk: string) => void;
  onToolCall: (name: string, args: any, context?: any) => Promise<any>;
  currentCwd?: string;
  abortSignal?: AbortSignal;
  isAutonomous?: boolean;
  options?: { provider?: string; model?: string; systemInstruction?: string };
}

export interface RunTurnOptions {
  message: string;
  imageBase64: string | null;
  onToolCall: (name: string, args: any, context?: any) => Promise<any>;
  currentCwd?: string;
  isAutonomous?: boolean;
  options?: { provider?: string; model?: string; systemInstruction?: string };
}

class TurnRunner {
  /**
   * Shrink history when it approaches the model's context window, replacing the
   * oldest turns with a model-written summary.
   *
   * Called at the top of each tool round rather than once per turn, because a
   * single turn can add ten rounds of large tool results and overflow mid-flight.
   * That is safe to do here: `findCutIndex` only ever returns a user message or a
   * plain model reply, and the turn's own user message is one of those, so a
   * mid-turn cut can never separate an in-flight tool call from its results.
   *
   * Never throws. A summarizer that fails is worth a warning, not a lost turn —
   * the provider call still goes out with the uncompacted history, which is
   * exactly what would have happened before this existed.
   */
  private async maybeCompact(
    provider: LLMProvider,
    model: string | undefined,
    state: CompactionState,
  ): Promise<void> {
    const history = lucaService.getTurnState().history;
    const contextWindowTokens = contextWindowFor(model);
    if (!needsCompaction(history, contextWindowTokens)) return;

    // Nothing has been appended since the last attempt, so a retry would produce
    // the same result and cost another summarizing call.
    if (history.length === state.lastAttemptedLength) return;
    state.lastAttemptedLength = history.length;

    try {
      const outcome = await compactHistory({
        history,
        contextWindowTokens,
        summarize: (prompt) => provider.generateContent(prompt),
      });

      if (!outcome) {
        console.warn(
          `[TURN_RUNNER] History is over budget (~${estimateHistoryTokens(history)} of ${contextWindowTokens} tokens) but has no safe cut point; sending it uncompacted.`,
        );
        return;
      }

      lucaService.replaceHistoryAfterCompaction(outcome.history);

      // Record the compaction in the durable transcript as a new entry. The rows
      // it covers are NOT rewritten — they stay on disk — but hydration after a
      // restart starts here, so the model is shown the same compacted view it is
      // being shown now instead of replaying turns the summary already describes.
      const summary = extractPriorSummary(outcome.history.slice(0, 1));
      if (summary) sessionTranscript.appendSummary(summary);

      console.log(
        `[TURN_RUNNER] Compacted ${outcome.messagesBefore}→${outcome.messagesAfter} messages (~${outcome.tokensBefore}→~${outcome.tokensAfter} tokens)`,
      );
    } catch (e: any) {
      console.warn(
        `[TURN_RUNNER] Compaction failed; sending uncompacted history: ${e?.message || e}`,
      );
    }
  }

  async runStreamTurn({
    message,
    imageBase64,
    onChunk,
    onToolCall,
    currentCwd,
    abortSignal,
    isAutonomous,
    options,
  }: RunStreamTurnOptions): Promise<any> {
    const originalMode = creditService.getMode();
    const route = lucaService.getProvisioningRoute(options?.model);
    let fullResponseText = "";
    let accumulatedGrounding: any = null;
    let generatedImage: string | undefined;
    let generatedVideo: string | undefined;
    const historyAtStart = [...lucaService.getTurnState().history];

    // Admission first, before anything mutates. This sits above `perceive`,
    // `beginTurn`, and `appendUserMessage` on purpose: a refused turn must leave
    // no trace at all — no mental state, no harness turn, and above all no user
    // entry appended to the shared transcript with no answer after it. That
    // orphaned entry is the exact corruption the lease exists to prevent, so
    // appending before refusing would create the very thing being guarded.
    const admission = await sessionLease.acquireForTurn();
    if (!admission.admitted) {
      console.warn(`[TURN_RUNNER] Turn refused — ${admission.message}`);
      onChunk(admission.message);
      return {
        text: admission.message,
        groundingMetadata: null,
        route,
        refused: true,
      };
    }

    harnessService.beginTurn(historyAtStart);
    console.log(
      `[TURN_RUNNER] Starting turn via ${route.kind} (${route.model})`,
    );

    try {
      await cognitiveDeliberator.perceive(message);

      const activeProvider = await lucaService.ensureTurnReady(options);
      if (imageBase64) {
        lucaService.setCurrentImageContext(imageBase64);
      }

      // --- OFFLINE / ZERO-LATENCY REFLEX FALLBACK ---
      const localReflex = await lucaService.classifyLocalReflexForTurn(message);
      if (localReflex.confidence >= 0.95 && localReflex.tool) {
        try {
          console.log(`[REFLEX] Triggering instant offline execution for: ${localReflex.tool}`);
          const toolResult = await onToolCall(
            localReflex.tool,
            localReflex.parameters,
            { currentCwd, isAutonomous: true }
          );
          const reflexResponse = lucaService.synthesizeReflexForTurn(
            localReflex.tool,
            toolResult,
            localReflex.thought,
          );
          lucaService.appendUserMessage(message);
          lucaService.appendModelMessage(reflexResponse);
          
          // Stream the response out instantly
          onChunk(reflexResponse);

          return {
            text: reflexResponse,
            groundingMetadata: null,
            route,
          };
        } catch (err) {
          console.warn("[REFLEX] Local execution failed, falling back to LLM:", err);
        }
      }

      lucaService.appendUserMessage(message);

      const executor = new StreamingToolExecutor(
        async (name, args, context) => {
          const mock = harnessService.getMockToolResult(name, args);
          if (mock) return mock.result;

          const res = await lucaService.executeToolForTurn(
            name,
            args,
            onToolCall,
             { ...context, isAutonomous, currentCwd },
          );

          if (res.groundingMetadata) {
            accumulatedGrounding = res.groundingMetadata;
          }
          if (res.generatedImage) {
            generatedImage = res.generatedImage;
            onChunk(`\n[[Solar:Image]] **PREVIEW**: Dynamic asset generated.`);
          }
          if (res.generatedVideo) {
            generatedVideo = res.generatedVideo;
          }

          return res.result;
        },
        (id, msg, prog) =>
          onChunk(
            `\n[[Solar:Progress]] {"id":"${id}", "message":"${msg}", "percent":${prog || 0}}`,
          ),
      );

      let keepGenerating = true;
      let toolRounds = 0;
      const compactionState: CompactionState = { lastAttemptedLength: -1 };
      while (keepGenerating) {
        keepGenerating = false;
        await this.maybeCompact(activeProvider, route.model, compactionState);
        const turnState = lucaService.getTurnState();
        const result = await (activeProvider as any).chatStream(
          turnState.history,
          (chunk: string) => {
            fullResponseText += chunk;
            onChunk(chunk);
          },
          imageBase64 ? [imageBase64] : undefined,
          turnState.systemInstruction,
          turnState.sessionTools,
          abortSignal,
        );

        if (result.thought) {
          thoughtStreamService.pushThought("REASONING", result.thought);
        }

        if (result.toolCalls && result.toolCalls.length > 0) {
          lucaService.appendModelMessage(result.text, result.toolCalls);
          const toolResults = await executor.executeBatch(result.toolCalls);
          for (const res of toolResults) {
            harnessService.recordToolCall(
              res.name,
              res.args,
              res.result,
              res.error,
            );
            lucaService.appendToolMessage(
              res.name,
              res.error || res.result,
              res.toolCallId,
            );
          }

          toolRounds++;
          if (toolRounds >= MAX_TOOL_ROUNDS) {
            const notice = `\n\n[Stopped: reached the ${MAX_TOOL_ROUNDS}-step tool limit for a single turn. Send another message to continue.]`;
            console.warn(
              `[TURN_RUNNER] Tool-round cap (${MAX_TOOL_ROUNDS}) reached; ending turn instead of looping.`,
            );
            fullResponseText += notice;
            onChunk(notice);
            // Close the turn with a model message so history never ends on a
            // tool result — the next turn would otherwise resume mid-exchange.
            lucaService.appendModelMessage(notice.trim());
          } else {
            keepGenerating = true;
          }
        } else {
          lucaService.appendModelMessage(result.text);
        }
      }

      await lucaService.extractTurnDirectives(message);
      return {
        text: fullResponseText,
        groundingMetadata: accumulatedGrounding,
        generatedImage,
        generatedVideo,
        route,
      };
    } catch (e: any) {
      onChunk(`\n${lucaService.mapCloudErrorForTurn(e)}`);
      return {
        text: fullResponseText,
        groundingMetadata: accumulatedGrounding,
        generatedImage,
        generatedVideo,
        route,
      };
    } finally {
      harnessService.endTurn({
        content: fullResponseText,
        thought: fullResponseText,
      });
      creditService.setMode(originalMode);
      // Awaited rather than fired and forgotten. A renewing holder keeps its
      // token, so a DELETE still in flight when the next turn acquires would
      // delete *that* turn's lease; awaiting keeps release strictly before the
      // next acquire. `releaseAfterTurn` never throws, so this cannot replace
      // the value the turn is returning.
      await sessionLease.releaseAfterTurn();
    }
  }

  async runTurn({
    message,
    imageBase64,
    onToolCall, 
    isAutonomous,
    currentCwd,
    options,
  }: RunTurnOptions): Promise<any> {
    const originalMode = creditService.getMode();
    const route = lucaService.getProvisioningRoute(options?.model);
    let finalResponseText = "";
    let accumulatedGrounding: any = null;
    let generatedImage: string | undefined;
    let generatedVideo: string | undefined;
    const historyAtStart = [...lucaService.getTurnState().history];

    // Same admission gate, same placement, and for the same reason as the
    // streaming path above. There is no `onChunk` here, so the refusal travels
    // back as the turn's text.
    const admission = await sessionLease.acquireForTurn();
    if (!admission.admitted) {
      console.warn(`[TURN_RUNNER] Non-stream turn refused — ${admission.message}`);
      return {
        text: admission.message,
        groundingMetadata: null,
        route,
        refused: true,
      };
    }

    harnessService.beginTurn(historyAtStart);
    console.log(
      `[TURN_RUNNER] Starting non-stream turn via ${route.kind} (${route.model})`,
    );

    try {
      await cognitiveDeliberator.perceive(message);

      const activeProvider = await lucaService.ensureTurnReady(options);
      if (imageBase64) {
        lucaService.setCurrentImageContext(imageBase64);
      }

      const localReflex = await lucaService.classifyLocalReflexForTurn(message);
      if (localReflex.confidence >= 0.95 && localReflex.tool) {
        try {
          const toolResult = await onToolCall(
            localReflex.tool,
            localReflex.parameters,
            { currentCwd, isAutonomous: true }
          );
          const reflexResponse = lucaService.synthesizeReflexForTurn(
            localReflex.tool,
            toolResult,
            localReflex.thought,
          );
          lucaService.appendUserMessage(message);
          lucaService.appendModelMessage(reflexResponse);
          return {
            text: reflexResponse,
            groundingMetadata: null,
            route,
          };
        } catch (err) {
          console.warn("[REFLEX] Local failed:", err);
        }
      }

      lucaService.appendUserMessage(message);

      const executor = new StreamingToolExecutor(
        async (name, args, context) => {
          const mock = harnessService.getMockToolResult(name, args);
          if (mock) return mock.result;

          const res = await lucaService.executeToolForTurn(
            name,
            args,
            onToolCall,
             { ...context, isAutonomous, currentCwd },
          );
          if (res.groundingMetadata) {
            accumulatedGrounding = res.groundingMetadata;
          }
          if (res.generatedImage) {
            generatedImage = res.generatedImage;
          }
          if (res.generatedVideo) {
            generatedVideo = res.generatedVideo;
          }
          return res.result;
        },
        (id, msg) =>
          thoughtStreamService.pushThought("ACTION", `[${id}] ${msg}`),
      );

      let loopCount = 0;
      const compactionState: CompactionState = { lastAttemptedLength: -1 };
      while (loopCount < MAX_TOOL_ROUNDS) {
        loopCount++;
        await this.maybeCompact(activeProvider, route.model, compactionState);
        const turnState = lucaService.getTurnState();
        const result = await (activeProvider as any).chat(
          turnState.history,
          imageBase64 ? [imageBase64] : undefined,
          turnState.systemInstruction,
          turnState.sessionTools,
        );
        finalResponseText = result.text;

        if (result.thought) {
          thoughtStreamService.pushThought("REASONING", result.thought);
        }

        if (result.toolCalls && result.toolCalls.length > 0) {
          lucaService.appendModelMessage(result.text, result.toolCalls);
          const toolResults = await executor.executeBatch(result.toolCalls);
          for (const res of toolResults) {
            harnessService.recordToolCall(
              res.name,
              res.args,
              res.result,
              res.error,
            );
            lucaService.appendToolMessage(
              res.name,
              res.error || res.result,
              res.toolCallId,
            );
          }
        } else {
          lucaService.appendModelMessage(result.text);
          break;
        }
      }

      await lucaService.extractTurnDirectives(message);
      return {
        text: finalResponseText,
        groundingMetadata: accumulatedGrounding,
        generatedImage,
        generatedVideo,
        route,
      };
    } catch (e: any) {
      return {
        text: lucaService.mapCloudErrorForTurn(e),
        groundingMetadata: accumulatedGrounding,
        generatedImage,
        generatedVideo,
        route,
      };
    } finally {
      harnessService.endTurn({
        content: finalResponseText,
        thought: finalResponseText,
      });
      creditService.setMode(originalMode);
      // Awaited for the same reason as in `runStreamTurn`: release must land
      // before the next turn's acquire, or a late DELETE could drop a lease that
      // turn is relying on.
      await sessionLease.releaseAfterTurn();
    }
  }
}

export const turnRunner = new TurnRunner();
