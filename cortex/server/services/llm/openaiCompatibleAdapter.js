/**
 * 🔌 OpenAI-Compatible Adapter — the core's provider-layer edge for every
 * vendor that speaks the OpenAI chat-completions wire format (OpenAI itself,
 * xAI Grok, DeepSeek, Mistral, Groq, local Cortex, local Ollama).
 *
 * This file is the ONLY place in the core that may import a vendor SDK for
 * chat. The wire format itself lives in src/shared/llm/openaiWire.js and is
 * shared with the renderer's OpenAIAdapter, so the two processes cannot drift.
 * See RFC-0006 Stage 2 and Invariant 4.
 */

import OpenAI from 'openai';
import {
  fromOpenAIChoice,
  toOpenAIMessages,
  toOpenAITools
} from '../../../../src/shared/llm/openaiWire.js';

export const DEFAULT_MAX_TOKENS = 512;

export class OpenAICompatibleAdapter {
  /**
   * @param {object} options
   * @param {string} options.apiKey
   * @param {string} options.modelName
   * @param {string} [options.baseURL]  omit to use the vendor default
   */
  constructor({ apiKey, modelName, baseURL } = {}) {
    this.modelName = modelName;
    this.baseURL = baseURL;

    const config = { apiKey };
    if (baseURL) config.baseURL = baseURL;
    this.client = new OpenAI(config);
  }

  /**
   * Single-shot text completion. Sends a plain string message body, matching
   * what the debate service sent before Stage 2 — some OpenAI-compatible
   * endpoints (local Cortex, older Ollama shims) reject array content.
   */
  async completeText({ prompt, maxTokens = DEFAULT_MAX_TOKENS } = {}) {
    const res = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens
    });
    return res.choices[0]?.message?.content ?? '';
  }

  /**
   * Full turn-shaped call: history, images, a system instruction and tools,
   * normalized to Luca's internal representation on the way out.
   *
   * Vision is its first live caller (Change 3): `/api/vision` routes a
   * screenshot through `llmGateway.chat`, so whichever provider serves vision
   * arrives here. Streaming and multi-turn tool loops come with the
   * core-resident turn loop (RFC-0006 Stage 3).
   */
  async chat({
    messages,
    images,
    systemInstruction,
    tools,
    maxTokens = DEFAULT_MAX_TOKENS
  } = {}) {
    const openAITools = toOpenAITools(tools);

    const res = await this.client.chat.completions.create({
      model: this.modelName,
      messages: toOpenAIMessages(messages, { images, systemInstruction }),
      max_tokens: maxTokens,
      tool_choice: openAITools ? 'auto' : undefined,
      tools: openAITools
    });

    return fromOpenAIChoice(res.choices[0]);
  }
}

export default OpenAICompatibleAdapter;
