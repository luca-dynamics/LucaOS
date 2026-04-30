import { IReasoningProvider, ChatChunk } from "../types";
import { lucaService } from "../../lucaService";

/**
 * LucaBrainProvider: The bridge between the Voice System and the OS Brain.
 * Updated to support true AbortSignal propagation for barge-in.
 */
export class LucaBrainProvider implements IReasoningProvider {
  async *chatStream(
    text: string,
    options?: {
      systemInstruction?: string;
      abortSignal?: AbortSignal;
      useVision?: boolean;
      model?: string;
      provider?: string;
    },
  ): AsyncGenerator<ChatChunk> {
    const isVisionRequested =
      options?.useVision ||
      /\b(see|look|screen|this|that|there|window|app|icon|button)\b/i.test(
        text,
      );

    const queue: ChatChunk[] = [];
    let isDone = false;
    let error: Error | null = null;

    // Trigger the callback-based stream with abortSignal and model support
    lucaService
      .sendMessageStream(
        text,
        isVisionRequested ? "CAPTURED" : null,
        (chunkText) => {
          queue.push({ text: chunkText, isFinal: false, done: false });
        },
        async () => null, // Tools handled internally by lucaService
        undefined, // currentCwd
        options?.abortSignal,
        { 
          model: options?.model,
          provider: options?.provider,
          systemInstruction: options?.systemInstruction 
        },
      )
      .then(() => {
        isDone = true;
        queue.push({ text: "", isFinal: true, done: true });
      })
      .catch((err) => {
        error = err;
        isDone = true;
      });

    // Poll the queue and yield chunks
    while (!isDone || queue.length > 0) {
      if (error) throw error;
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      if (options?.abortSignal?.aborted) {
        isDone = true;
        break;
      }
    }
  }
}
