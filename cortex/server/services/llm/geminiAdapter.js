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
}

export default GeminiAdapter;
