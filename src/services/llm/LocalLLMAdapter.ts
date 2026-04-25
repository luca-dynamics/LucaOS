import { LLMProvider, ChatMessage, LLMResponse } from "./LLMProvider";
import { CORTEX_SERVER_URL, OLLAMA_SERVER_URL } from "../../config/api";
import { settingsService } from "../settingsService";
import { modelManager, LOCAL_BRAIN_MODEL_IDS } from "../ModelManagerService";

// Define locally to avoid dependency issues if not exported
interface ToolFunction {
  name: string;
  description?: string;
  parameters?: any;
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
   * Resolve the best endpoint for this model.
   * Priority: Ollama (if detected & has model) > Cortex > Ollama fallback
   */
  private async resolveEndpoint(): Promise<string> {
    const settings = settingsService.getSettings();
    const preferOllama = settings.brain.preferOllama;
    
    // 1. Identify Model Category
    const isBrainModel = LOCAL_BRAIN_MODEL_IDS.includes(this.name) || this.name.startsWith("local-gemma");

    // 2. Routing Decision
    // BRAIN MODELS: Default to Ollama (Industry Standard for stability/VRAM management)
    // OTHER MODELS: If preferOllama is on, use it; else use Cortex (Internal)
    if (isBrainModel || preferOllama) {
      await modelManager.ensureOllamaRunning();
      console.log(`[Local Adapter] Routing ${this.name} → Ollama (Sovereign Reliability Managed)`);
      return `${OLLAMA_SERVER_URL}/v1/chat/completions`;
    }

    // Default Fallback: Internal Cortex Brain
    console.log(`[Local Adapter] Routing ${this.name} → Internal Cortex`);
    return `${CORTEX_SERVER_URL}/chat/completions`;
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
          content: msg.content,
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
      const backendTools = tools
        ? tools.map((t) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

      // 5. Smart Routing: Ollama (if detected) > Cortex > Ollama fallback
      const endpoint = await this.resolveEndpoint();
      
      // Resolve the actual Ollama tag from the ModelManager if possible
      let modelTag = this.name;
      try {
        const specs = modelManager.getModelSpecs(this.name);
        if (specs && specs.ollamaTag) {
          modelTag = specs.ollamaTag;
        } else if (this.name.includes("-")) {
          // Fallback heuristic for ad-hoc models
          modelTag = this.name.replace("-2b", "2:2b").replace("-mini", ":mini").replace("-7b", ":7b");
        }
      } catch (e) {
        console.warn("[Local Adapter] Tag resolution failed, using ID:", e);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelTag, // Pass the tag Ollama expects
          messages: messages,
          tools: backendTools,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(120_000), 
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Local Brain Error (${endpoint}): ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const result = await response.json();

      // 6. Parsing Response (OpenAI Format)
      const choice = result.choices[0];
      const content = choice.message.content || "";
      const messageToolCalls = choice.message.tool_calls;

      // Check for JSON Tool Call (Simple regex heuristic for now)
      // The backend prompt specifically asks for: { "tool": "name", "arguments": {} }
      const toolCalls: any[] = [];

      // A. Native Tool Calls (Ollama/OpenAI standard)
      if (messageToolCalls && messageToolCalls.length > 0) {
        toolCalls.push(
          ...messageToolCalls.map((tc: any) => ({
            id: tc.id || "call_" + Date.now(),
            name: tc.function.name,
            args:
              typeof tc.function.arguments === "string"
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments,
          })),
        );
      }

      // B. JSON Block Fallback (for non-function-calling models)
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const potentialJson = jsonMatch ? jsonMatch[0] : content;

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
        text: content, // ALWAYS return content, even if tools are present (Ollama often explains tools)
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
          content: msg.content,
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

      // 2. Smart Routing: Ollama (if detected) > Cortex > Ollama fallback
      const endpoint = await this.resolveEndpoint();

      // Resolve the actual Ollama tag from the ModelManager if possible
      let modelTag = this.name;
      try {
        const specs = modelManager.getModelSpecs(this.name);
        if (specs && specs.ollamaTag) {
          modelTag = specs.ollamaTag;
        } else if (this.name.includes("-")) {
          // Fallback heuristic for ad-hoc models (including Gemma 4 translation)
          modelTag = this.name.replace("-e2b", ":e2b").replace("-31b", ":31b").replace("-4-", "4:").replace("-2b", "2:2b").replace("-mini", ":mini").replace("-7b", ":7b");
        }
      } catch (e) {
        console.warn("[Local Adapter] Tag resolution failed, using ID:", e);
      }

      // 3. Map Tools (Copy from chat)
      const backendTools = tools
        ? tools.map((t) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

      // 4. Request with stream: true
      let response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortSignal,
        body: JSON.stringify({
          model: modelTag,
          messages: messages,
          tools: backendTools,
          stream: true, // ENABLE STREAMING
          temperature: 0.7,
        }),
      });

      // FALLBACK: If streaming fails (500/400), try non-streaming
      if (!response.ok) {
        console.warn(
          `[Local Adapter] Streaming failed (${response.status}), falling back to blocking...`,
        );
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelTag,
            messages: messages,
            tools: backendTools,
            stream: false, // DISABLE STREAMING
            temperature: 0.7,
          }),
        });
      }

      if (!response.body)
        throw new Error("ReadableStream not supported in this environment");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") continue; // End of stream

              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta?.content;
                if (delta) {
                  onToken(delta);
                  fullText += delta;
                }
              } catch {
                // Ignore parse errors for partial lines
              }
            }
          }
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
