import { creditService } from "../creditService";
import { harnessService } from "../harnessService";
import { thoughtStreamService } from "../thoughtStreamService";
import { cognitiveDeliberator } from "../cognitiveDeliberator";
import { StreamingToolExecutor } from "../streamingToolExecutor";
import { lucaService } from "../lucaService";

export interface RunStreamTurnOptions {
  message: string;
  imageBase64: string | null;
  onChunk: (chunk: string) => void;
  onToolCall: (name: string, args: any, context?: any) => Promise<any>;
  currentCwd?: string;
  abortSignal?: AbortSignal;
  options?: { provider?: string; model?: string; systemInstruction?: string };
}

export interface RunTurnOptions {
  message: string;
  imageBase64: string | null;
  onToolCall: (name: string, args: any, context?: any) => Promise<any>;
  currentCwd?: string;
  options?: { provider?: string; model?: string; systemInstruction?: string };
}

class TurnRunner {
  async runStreamTurn({
    message,
    imageBase64,
    onChunk,
    onToolCall,
    abortSignal,
    options,
  }: RunStreamTurnOptions): Promise<any> {
    const originalMode = creditService.getMode();
    const route = lucaService.getProvisioningRoute(options?.model);
    let fullResponseText = "";
    let accumulatedGrounding: any = null;
    let generatedImage: string | undefined;
    let generatedVideo: string | undefined;
    const historyAtStart = [...lucaService.getTurnState().history];

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

      lucaService.appendUserMessage(message);

      const executor = new StreamingToolExecutor(
        async (name, args, context) => {
          const mock = harnessService.getMockToolResult(name, args);
          if (mock) return mock.result;

          const res = await lucaService.executeToolForTurn(
            name,
            args,
            onToolCall,
            context,
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
      while (keepGenerating) {
        keepGenerating = false;
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
          keepGenerating = true;
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
    }
  }

  async runTurn({
    message,
    imageBase64,
    onToolCall,
    options,
  }: RunTurnOptions): Promise<any> {
    const originalMode = creditService.getMode();
    const route = lucaService.getProvisioningRoute(options?.model);
    let finalResponseText = "";
    let accumulatedGrounding: any = null;
    let generatedImage: string | undefined;
    let generatedVideo: string | undefined;
    const historyAtStart = [...lucaService.getTurnState().history];

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
            context,
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
      while (loopCount < 10) {
        loopCount++;
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
    }
  }
}

export const turnRunner = new TurnRunner();
