import { normalizeToolCalls, parseToolArguments } from "./llmContract.js";

export function toOpenAIMessages(messages, options = {}) {
  const { images, systemInstruction } = options;
  const source = messages || [];

  const mapped = source.map((message, index) => {
    const isLast = index === source.length - 1;

    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: message.toolCallId,
        content: message.content,
      };
    }

    if (message.role === "model") {
      const assistant = { role: "assistant" };
      if (message.content) assistant.content = message.content;
      if (message.toolCalls) {
        assistant.tool_calls = message.toolCalls.map((toolCall) => ({
          id: toolCall.id,
          type: "function",
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.args),
          },
        }));
      }
      return assistant;
    }

    const content = [];
    if (message.content) content.push({ type: "text", text: message.content });
    if (isLast && images && images.length > 0) {
      for (const image of images) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${image}` },
        });
      }
    }
    return { role: message.role, content };
  });

  if (systemInstruction) {
    mapped.unshift({ role: "system", content: systemInstruction });
  }

  return mapped;
}

export function toOpenAITools(tools) {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function fromOpenAIChoice(choice) {
  const message = choice?.message ?? {};
  const text = message.content || "";
  const rawToolCalls = message.tool_calls;

  if (!rawToolCalls || rawToolCalls.length === 0) {
    return { text, toolCalls: undefined };
  }

  return {
    text,
    toolCalls: normalizeToolCalls(
      rawToolCalls.map((toolCall) => ({
        name: toolCall.function?.name,
        args: parseToolArguments(toolCall.function?.arguments),
        id: toolCall.id,
      })),
    ),
  };
}

export function createOpenAIStreamAccumulator(onChunk) {
  let text = "";
  const pending = {};

  return {
    ingest(chunk) {
      const delta = chunk?.choices?.[0]?.delta;
      if (!delta) return;

      if (delta.content) {
        text += delta.content;
        if (onChunk) onChunk(delta.content);
      }

      if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (!pending[toolCall.index]) {
            pending[toolCall.index] = {
              id: toolCall.id,
              name: toolCall.function?.name,
              args: "",
            };
          }
          if (toolCall.function?.arguments) {
            pending[toolCall.index].args += toolCall.function.arguments;
          }
        }
      }
    },

    finish() {
      const toolCalls = [];
      for (const toolCall of Object.values(pending)) {
        try {
          toolCalls.push({
            id: toolCall.id,
            name: toolCall.name,
            args: parseToolArguments(toolCall.args),
          });
        } catch (error) {
          console.error(
            "[openaiWire] Failed to parse streamed tool arguments:",
            error,
          );
        }
      }
      return { text, toolCalls: normalizeToolCalls(toolCalls) };
    },
  };
}
