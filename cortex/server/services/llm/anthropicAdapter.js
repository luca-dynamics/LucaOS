/**
 * 🧠 Anthropic Adapter — the core's provider-layer edge for Claude.
 *
 * This file is the ONLY place in cortex/server that may import
 * @anthropic-ai/sdk. Both processes resolve the same SDK version, so the full
 * wire format — request and response — is shared with the renderer's
 * AnthropicAdapter via src/shared/llm/anthropicWire.js.
 * See RFC-0006 Stage 2, Change 2 and Invariant 4.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  fromAnthropicMessage,
  toAnthropicMessages,
  toAnthropicTools
} from '../../../../src/shared/llm/anthropicWire.js';

const DEFAULT_MAX_TOKENS = 512;

export class AnthropicAdapter {
  /**
   * @param {object} options
   * @param {string} options.apiKey
   * @param {string} options.modelName
   */
  constructor({ apiKey, modelName } = {}) {
    this.modelName = modelName;
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Single-shot text completion. Anthropic requires max_tokens, so unlike the
   * Gemini adapter this one honours the caller's limit.
   */
  async completeText({ prompt, maxTokens = DEFAULT_MAX_TOKENS } = {}) {
    const msg = await this.client.messages.create({
      model: this.modelName,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });
    return msg.content[0]?.text ?? '';
  }

  /**
   * Full turn-shaped call: history, images, a system instruction and tools,
   * normalized to Luca's internal representation on the way out.
   *
   * Both processes resolve the same SDK version, so every part of this — request
   * and response — comes from the shared wire. A system instruction is the
   * separate `system` parameter here, not a message.
   */
  async chat({
    messages,
    images,
    systemInstruction,
    tools,
    maxTokens = DEFAULT_MAX_TOKENS
  } = {}) {
    const anthropicTools = toAnthropicTools(tools);

    const request = {
      model: this.modelName,
      max_tokens: maxTokens,
      messages: toAnthropicMessages(messages, { images })
    };
    if (systemInstruction) request.system = systemInstruction;
    if (anthropicTools) request.tools = anthropicTools;

    return fromAnthropicMessage(await this.client.messages.create(request));
  }
}

export default AnthropicAdapter;
