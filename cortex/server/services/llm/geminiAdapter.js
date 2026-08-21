/**
 * ✨ Gemini Adapter — the core's provider-layer edge for Google Gemini.
 *
 * This file is the ONLY place in cortex/server that may import @google/genai.
 * The request wire format it shares with the renderer lives in
 * src/shared/llm/geminiWire.js; the response side stays here because the two
 * processes run different Gemini SDKs (@google/genai here, @google/generative-ai
 * in the renderer) and they disagree on response shape.
 * See RFC-0006 Stage 2, Change 2 and Invariant 4.
 */

import { GoogleGenAI } from '@google/genai';
import {
  extractGeminiThought,
  normalizeGeminiToolCalls,
  toGeminiContents,
  toGeminiSystemInstruction,
  toGeminiTools
} from '../../../../src/shared/llm/geminiWire.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

export class GeminiAdapter {
  /**
   * @param {object} options
   * @param {string} options.apiKey
   * @param {string} [options.modelName]  blank falls back to DEFAULT_GEMINI_MODEL
   */
  constructor({ apiKey, modelName } = {}) {
    this.modelName = modelName || DEFAULT_GEMINI_MODEL;
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Single-shot text completion. Sends the prompt as a plain string, which this
   * SDK accepts in place of a contents array — exactly what the debate service
   * sent before the move.
   *
   * `maxTokens` is deliberately ignored: the pre-Stage-2 call set no output
   * limit for Gemini, and honouring the gateway's 512 default here would newly
   * truncate responses on Luca's default brain. A cap belongs in the caller's
   * config, not in a refactor.
   */
  async completeText({ prompt } = {}) {
    const result = await this.client.models.generateContent({
      model: this.modelName,
      contents: prompt
    });
    return result.text ?? '';
  }

  /**
   * Full turn-shaped call: history, images, a system instruction and tools,
   * normalized to Luca's internal representation on the way out.
   *
   * The request side comes from the shared wire; only the response side is
   * SDK-specific, because @google/genai exposes `result.text` and
   * `result.functionCalls` where the renderer's @google/generative-ai exposes
   * `result.response.text()`.
   *
   * `maxTokens` is honoured only when the caller sets it. Defaulting it would
   * newly truncate callers that never had an output limit — the same reasoning
   * as `completeText` above.
   */
  async chat({ messages, images, systemInstruction, tools, maxTokens } = {}) {
    const geminiTools = toGeminiTools(tools);
    const instruction = toGeminiSystemInstruction(systemInstruction);

    const config = {};
    if (geminiTools) config.tools = geminiTools;
    if (instruction) config.systemInstruction = instruction;
    if (maxTokens) config.maxOutputTokens = maxTokens;

    const request = {
      model: this.modelName,
      contents: toGeminiContents(messages, { images })
    };
    if (Object.keys(config).length > 0) request.config = config;

    const result = await this.client.models.generateContent(request);
    const { thought, thought_signature } = extractGeminiThought(result);

    return {
      text: result.text ?? '',
      thought,
      thought_signature,
      toolCalls: normalizeGeminiToolCalls(result.functionCalls)
    };
  }
}

export default GeminiAdapter;
