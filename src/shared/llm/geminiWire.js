import { normalizeToolCalls, resolveImagePayload } from "./llmContract.js";

/**
 * Google Gemini wire format — request side, plus the thought/signature scan.
 *
 * The renderer resolves `@google/generative-ai` and the core resolves
 * `@google/genai`. The two agree on the request shape (`contents` of
 * `role`/`parts`), which is why it is shared here, and disagree on the response
 * shape (`result.response.text()` vs `result.text`), which is why text and
 * tool-call extraction stay at each edge with its own SDK. This module maps
 * payloads only: no SDK import, no client construction, no environment reads.
 *
 * RFC-0006 Stage 2, Change 2.
 */

/**
 * Builds Gemini `contents` from Luca's chat history.
 *
 * CRITICAL: consecutive `tool` messages are grouped into a single `function`
 * role message. Gemini requires strictly alternating roles and rejects a run of
 * separate function messages.
 */
export function toGeminiContents(messages, options = {}) {
  const { images } = options;
  const source = messages || [];

  const contents = [];
  let currentGroup = null;

  source.forEach((message, index) => {
    const isLast = index === source.length - 1;

    if (message.role === "tool") {
      const part = {
        functionResponse: {
          name: message.name || "unknown",
          response: { result: message.content },
        },
      };

      if (currentGroup && currentGroup.role === "function") {
        currentGroup.parts.push(part);
      } else {
        currentGroup = { role: "function", parts: [part] };
        contents.push(currentGroup);
      }
      return;
    }

    if (message.role === "model") {
      const parts = [];
      if (message.thought) parts.push({ thought: message.thought });
      if (message.thought_signature) {
        parts.push({ thought_signature: message.thought_signature });
      }
      if (message.content) parts.push({ text: message.content });
      if (message.toolCalls) {
        for (const toolCall of message.toolCalls) {
          parts.push({
            functionCall: { name: toolCall.name, args: toolCall.args },
          });
        }
      }
      // Safeguard: an empty parts array is an API error.
      if (parts.length === 0) parts.push({ text: "" });
      currentGroup = { role: "model", parts };
      contents.push(currentGroup);
      return;
    }

    // user or system. Images attach to the last message only, after its text.
    const parts = [{ text: message.content || "" }];
    if (isLast && images && images.length > 0) {
      for (const image of images) {
        const { data, mimeType } = resolveImagePayload(image);
        parts.push({ inlineData: { data, mimeType } });
      }
    }
    currentGroup = { role: "user", parts };
    contents.push(currentGroup);
  });

  return contents;
}

/**
 * Luca's tool specs already use Google's FunctionDeclaration shape, so they pass
 * through unmapped — only the wrapper is needed.
 */
export function toGeminiTools(tools) {
  if (!tools || tools.length === 0) return undefined;
  return [{ functionDeclarations: tools }];
}

export function toGeminiSystemInstruction(systemInstruction) {
  if (!systemInstruction) return undefined;
  return { role: "system", parts: [{ text: systemInstruction }] };
}

/**
 * Reads thoughts and thought signatures out of anything that carries
 * `candidates` — `result.response` on the renderer's SDK, `result` on the
 * core's — so neither SDK has to be imported here.
 *
 * Multiple thought parts in one holder are concatenated. Both call sites
 * previously kept only the last, which silently dropped the earlier ones.
 */
export function extractGeminiThought(candidatesHolder) {
  const parts = candidatesHolder?.candidates?.[0]?.content?.parts;
  if (!parts) return { thought: undefined, thought_signature: undefined };

  let thought = "";
  let thought_signature;

  for (const part of parts) {
    if (part && "thought" in part && part.thought) {
      thought += part.thought;
    }
    if (part && ("thought_signature" in part || "thoughtSignature" in part)) {
      thought_signature = part.thought_signature || part.thoughtSignature;
    }
  }

  return { thought: thought || undefined, thought_signature };
}

/** Gemini function calls carry no id, unlike OpenAI and Anthropic tool calls. */
export function normalizeGeminiToolCalls(calls) {
  if (!calls || calls.length === 0) return undefined;
  return normalizeToolCalls(
    calls.map((call) => ({ name: call.name, args: call.args })),
  );
}
