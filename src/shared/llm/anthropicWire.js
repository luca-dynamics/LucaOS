import { normalizeToolCalls } from "./llmContract.js";

/**
 * Anthropic Messages API wire format.
 *
 * Both the renderer and the core resolve the same `@anthropic-ai/sdk`, so this
 * module can describe the full round trip. It maps payloads only: no SDK import,
 * no client construction, no environment reads. Each edge builds its own client.
 *
 * RFC-0006 Stage 2, Change 2.
 */

const IMAGE_MEDIA_TYPE = "image/jpeg";

/**
 * Anthropic has no `tool` role — a tool result is a `user` message carrying a
 * `tool_result` block. A system instruction is NOT a message here; it is the
 * separate `system` request parameter, so it never appears in this array.
 */
export function toAnthropicMessages(messages, options = {}) {
  const { images } = options;
  const source = messages || [];

  return source.map((message, index) => {
    const isLast = index === source.length - 1;

    if (message.role === "tool") {
      return {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: message.toolCallId || "unknown",
            content: message.content,
          },
        ],
      };
    }

    if (message.role === "model") {
      const content = [];
      if (message.thought) {
        content.push({
          type: "thinking",
          thinking: message.thought,
          signature: message.thought_signature,
        });
      }
      if (message.content) content.push({ type: "text", text: message.content });
      if (message.toolCalls) {
        for (const toolCall of message.toolCalls) {
          content.push({
            type: "tool_use",
            id: toolCall.id,
            name: toolCall.name,
            input: toolCall.args,
          });
        }
      }
      return { role: "assistant", content };
    }

    const content = [];
    // Images attach to the last message only, ahead of its text.
    if (isLast && images && images.length > 0) {
      for (const image of images) {
        content.push({
          type: "image",
          source: { type: "base64", media_type: IMAGE_MEDIA_TYPE, data: image },
        });
      }
    }
    if (message.content) content.push({ type: "text", text: message.content });
    return { role: "user", content };
  });
}

export function toAnthropicTools(tools) {
  if (!tools || tools.length === 0) return undefined;
  // Luca's tool parameters are JSON Schema, which is what `input_schema` wants.
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

export function fromAnthropicMessage(response) {
  const blocks = response?.content ?? [];

  const textBlock = blocks.find((block) => block.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text : "";

  const toolUseBlocks = blocks.filter((block) => block.type === "tool_use");
  const toolCalls = normalizeToolCalls(
    toolUseBlocks.map((block) => ({
      name: block.name,
      args: block.input,
      id: block.id,
    })),
  );

  const thinkingBlock = blocks.find((block) => block.type === "thinking");
  const thought =
    thinkingBlock && "thinking" in thinkingBlock
      ? thinkingBlock.thinking
      : undefined;
  const thought_signature =
    thinkingBlock && "signature" in thinkingBlock
      ? thinkingBlock.signature
      : undefined;

  return { text, toolCalls, thought, thought_signature };
}

/**
 * Accumulates a streamed Anthropic response.
 *
 * Tool arguments arrive as `input_json_delta` fragments, but the SDK already
 * assembles them onto its own in-flight message. Rather than re-parsing the
 * fragments, `ingest` reads the completed block at `content_block_stop` — pass
 * `stream.currentMessage` as the second argument for that to work.
 */
export function createAnthropicStreamAccumulator(onChunk) {
  let text = "";
  let thought = "";
  const toolCalls = [];

  return {
    ingest(chunk, currentMessage) {
      if (!chunk) return;

      if (chunk.type === "content_block_delta") {
        if (chunk.delta?.type === "text_delta") {
          text += chunk.delta.text;
          if (onChunk) onChunk(chunk.delta.text);
        } else if (chunk.delta?.type === "thinking_delta") {
          // Thoughts accumulate but are not forwarded to the caller's stream.
          thought += chunk.delta.thinking;
        }
        return;
      }

      if (chunk.type === "content_block_stop" && chunk.index !== undefined) {
        const block = currentMessage?.content?.[chunk.index];
        if (block?.type === "tool_use") {
          toolCalls.push({ name: block.name, args: block.input, id: block.id });
        }
      }
    },

    finish() {
      return {
        text,
        thought: thought || undefined,
        // Anthropic does not return a thought signature; Gemini does.
        thought_signature: undefined,
        toolCalls: normalizeToolCalls(toolCalls),
      };
    },
  };
}
