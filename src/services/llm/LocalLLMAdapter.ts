import { LLMProvider, ChatMessage, LLMResponse } from "./LLMProvider";
import { OLLAMA_SERVER_URL } from "../../config/api";
import { settingsService } from "../settingsService";
import { modelManager, LOCAL_BRAIN_MODEL_IDS } from "../ModelManagerService";
import { lucaLocalModelRuntime } from "../local-models/LucaLocalModelRuntime";
import type { LocalChatMessage, LocalToolDefinition } from "../local-models/LocalModelTypes";

// Define locally to avoid dependency issues if not exported
interface ToolFunction {
  name: string;
  description?: string;
  parameters?: any;
}

interface LocalRuntimeTarget {
  model: string;
}

export class LocalLLMAdapter implements LLMProvider {
  public name: string;

  // Ollama auto-detection cache (refreshes every 60s)
  private static ollamaStatus: {
    available: boolean;
    models: string[];
    checkedAt: number;
  } | null = null;

  constructor(modelName: string = "local-gemma-2b") {
    this.name = modelName;
  }

  /**
   * Public getter for system awareness
   */
  public static async getOllamaStatus() {
     // Trigger a check if none exists
     const adapter = new LocalLLMAdapter();
     return await adapter.checkOllama();
  }

  /**
   * Check if Ollama is running and cache the result for 60s.
   * Returns the list of available Ollama model names.
   */
  private async checkOllama(): Promise<{
    available: boolean;
    models: string[];
  }> {
    const cache = LocalLLMAdapter.ollamaStatus;
    if (cache && Date.now() - cache.checkedAt < 60_000) {
      return { available: cache.available, models: cache.models };
    }
    try {
      const resp = await fetch(`${OLLAMA_SERVER_URL}/api/tags`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (!resp.ok) throw new Error("Not OK");
      const data = await resp.json();
      const models = (data.models || []).map((m: any) => m.name as string);
      LocalLLMAdapter.ollamaStatus = {
        available: true,
        models,
        checkedAt: Date.now(),
      };
      return { available: true, models };
    } catch {
      LocalLLMAdapter.ollamaStatus = {
        available: false,
        models: [],
        checkedAt: Date.now(),
      };
      return { available: false, models: [] };
    }
  }

  /**
   * Resolve the model into Luca's owned local-runtime facade.
   *
   * This intentionally mirrors the legacy endpoint routing while moving the
   * actual chat execution through `lucaLocalModelRuntime`, where admission
   * control, leases, runtime registry lookup, and adapter normalization live.
   */
  private async resolveRuntimeTarget(): Promise<LocalRuntimeTarget> {
    const settings = settingsService.getSettings();
    const preferOllama = settings.brain.preferOllama;
    const specs = modelManager.getModelSpecs(this.name);
    const isBrainModel =
      LOCAL_BRAIN_MODEL_IDS.includes(this.name) || this.name.startsWith("local-gemma");

    if (
      specs?.runtime === "ollama" ||
      specs?.ollamaTag ||
      (!specs && (isBrainModel || preferOllama))
    ) {
      await modelManager.ensureOllamaRunning();
      return {
        model: resolveRuntimeModelId(this.name),
      };
    }

    return {
      model: specs?.id ?? this.name,
    };
  }

  // Basic generation (non-chat)
  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const response = await this.chat(
      [{ role: "user", content: prompt }],
      images,
    );
    return response.text || "";
  }

  // Stream not implemented yet for local
  async streamContent(
    prompt: string,
    onToken: (text: string) => void,
  ): Promise<string> {
    const text = await this.generateContent(prompt);
    onToken(text);
    return text;
  }

  async chat(
    history: ChatMessage[],
    imageUrls?: string[],
    systemInstruction?: string,
    tools?: ToolFunction[],
  ): Promise<LLMResponse> {
    try {
      // 1. Construct Messages
      const messages: any[] = [];

      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }

      // 2. Add History
      history.forEach((msg) => {
        messages.push({
          role: msg.role === "model" ? "assistant" : msg.role,
          content: msg.content || " ", // Ollama 400s on empty content
        });
      });

      // 3. Handle Images (Ollama support depends on model, e.g. Llama 3.2 Vision)
      // We pass it to Ollama; if the model is text-only, Ollama might ignore or error, but let's try.
      if (imageUrls && imageUrls.length > 0) {
        // Attach images to the LAST user message if possible
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          // Ollama expects 'images': [base64] in the message object
          lastMsg.images = imageUrls;
        } else {
          messages.push({
            role: "user",
            content: " [Image Attachment]",
            images: imageUrls,
          });
        }
      }

      // 4. Map Tools to JSON Schema
      const backendTools: LocalToolDefinition[] | undefined = tools
        ? tools.map((t) => ({
            type: "function" as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

      // 5. Runtime facade routing: Cortex/Ollama selection stays here, but
      // execution now flows through Luca's owned local-model runtime.
      const target = await this.resolveRuntimeTarget();

      const localResponse = await lucaLocalModelRuntime.chat({
        model: target.model,
        messages: messages.map(toLocalChatMessage),
        temperature: 0.7,
        tools: backendTools,
      });

      // Check for JSON Tool Call (Simple regex heuristic for now)
      // The backend prompt specifically asks for: { "tool": "name", "arguments": {} }
      const toolCalls: any[] = localResponse.toolCalls
        ? localResponse.toolCalls.map((toolCall) => ({
            id: toolCall.id,
            name: toolCall.name,
            args: toolCall.args,
          }))
        : [];

      // JSON Block Fallback (for non-function-calling models)
      try {
        const jsonMatch = localResponse.text.match(/\{[\s\S]*\}/);
        const potentialJson = jsonMatch ? jsonMatch[0] : localResponse.text;

        if (
          potentialJson.includes('"tool"') &&
          potentialJson.includes('"arguments"')
        ) {
          const parsed = JSON.parse(potentialJson);
          if (parsed.tool && parsed.arguments) {
            toolCalls.push({
              id: "call_" + Date.now(),
              name: parsed.tool,
              args: parsed.arguments,
            });
          }
        }
      } catch {
        // Not a JSON tool call, just text
      }

      return {
        text: localResponse.text, // ALWAYS return content, even if tools are present (Ollama often explains tools)
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (err: any) {
      console.error("[Local Adapter] Chat Failed:", err);
      return {
        text: `Error connecting to Local Brain (${this.name}): ${err.message}. Is Ollama running?`,
      };
    }
  }

  // Streaming Chat Implementation
  async chatStream(
    history: ChatMessage[],
    onToken: (chunk: string) => void,
    imageUrls?: string[],
    systemInstruction?: string,
    tools?: any[],
    abortSignal?: AbortSignal,
  ): Promise<LLMResponse> {
    try {
      // 1. Construct Messages (Same as chat)
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      history.forEach((msg) => {
        messages.push({
          role: msg.role === "model" ? "assistant" : msg.role,
          content: msg.content || " ", // Ollama 400s on empty content
        });
      });

      if (imageUrls && imageUrls.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          lastMsg.images = imageUrls;
        } else {
          messages.push({
            role: "user",
            content: " [Image Attachment]",
            images: imageUrls,
          });
        }
      }

      // 2. Map Tools (Copy from chat)
      const backendTools: LocalToolDefinition[] | undefined = tools
        ? tools.map((t) => ({
            type: "function" as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

      // 3. Stream through Luca's owned runtime facade so admission, leases,
      // registry routing, and runtime-specific parsing stay centralized.
      const target = await this.resolveRuntimeTarget();
      const stream = lucaLocalModelRuntime.stream({
        model: target.model,
        messages: messages.map(toLocalChatMessage),
        temperature: 0.7,
        signal: abortSignal,
        tools: backendTools,
      });
      let fullText = "";

      for await (const event of stream) {
        if (event.type === "token") {
          onToken(event.text);
          fullText += event.text;
        }
      }

      return { text: fullText };
    } catch (err: any) {
      console.error("[Local Adapter] Chat Stream Failed:", err);
      return {
        text: `Error connecting to Local Brain (${this.name}): ${err.message}`,
      };
    }
  }

  async validateKey(): Promise<{ valid: boolean; message: string; details?: any }> {
    try {
      const status = await this.checkOllama();
      if (status.available) {
        return { valid: true, message: "Ollama is running and accessible." };
      }
      return { valid: false, message: "Ollama is not responding. Ensure it is installed and running." };
    } catch (e: any) {
      return { valid: false, message: "Local connection failed.", details: e };
    }
  }
}

function resolveRuntimeModelId(modelName: string): string {
  try {
    const specs = modelManager.getModelSpecs(modelName);
    if (specs?.ollamaTag) return specs.ollamaTag;
  } catch (error) {
    console.warn("[Local Adapter] Tag resolution failed, using ID:", error);
  }

  return modelName;
}

function toLocalChatMessage(message: Record<string, any>): LocalChatMessage {
  return {
    role: message.role as LocalChatMessage["role"],
    content: message.content || " ",
    toolCallId: message.tool_call_id,
  };
}
