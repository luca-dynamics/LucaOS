/**
 * LLM Service Abstraction Layer
 *
 * Provides a unified interface for multiple LLM providers.
 * Currently supports Gemini, with placeholders for OpenAI, Claude, and Ollama.
 *
 * Usage:
 *   const llm = llmService.getProvider('gemini');
 *   const response = await llm.generate(prompt);
 */

import { FunctionDeclaration } from "@google/generative-ai";
import { BRAIN_CONFIG } from "../config/brain.config";
import { getApiKey } from "./genAIClient";
import { settingsService } from "./settingsService";
import { environmentSentinel } from "./environmentSentinel";

// --- LLM PROVIDER INTERFACE ---
export interface LLMProvider {
  name: string;
  model: string;
  generate(prompt: string, options?: LLMGenerateOptions): Promise<string>;
  stream?(prompt: string, options?: LLMGenerateOptions): AsyncGenerator<string>;
  chat?(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string>;
  supportsFunctions?: boolean;
  supportsStreaming?: boolean;
  maxTokens?: number;
  costPerToken?: { input: number; output: number }; // Cost in USD per 1M tokens
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  functions?: FunctionDeclaration[];
  systemPrompt?: string;
}

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// --- GEMINI PROVIDER (CURRENT) ---
class GeminiProvider implements LLMProvider {
  name = "gemini";
  model: string;
  private apiKey: string;

  constructor(model: string = BRAIN_CONFIG.defaults.brain) {
    this.model = model;
    this.apiKey = getApiKey();
  }

  supportsFunctions = true;
  supportsStreaming = true;
  maxTokens = 8192;
  costPerToken = { input: 0.5, output: 1.5 }; // Approximate Gemini Pro pricing per 1M tokens

  async generate(
    prompt: string,
    options?: LLMGenerateOptions,
  ): Promise<string> {
    try {
      // Use fetch API directly for now (simpler than SDK)
      const brainSettings = settingsService.get("brain");
      const apiKey = getApiKey();
      const baseUrl =
        brainSettings?.geminiBaseUrl || BRAIN_CONFIG.providers.gemini.baseUrl;

      const response = await fetch(
        `${baseUrl}/models/${this.model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens ?? this.maxTokens,
            },
            systemInstruction: options?.systemPrompt
              ? { parts: [{ text: options.systemPrompt }] }
              : undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error: any) {
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  async *stream(
    prompt: string,
    options?: LLMGenerateOptions,
  ): AsyncGenerator<string> {
    try {
      const brainSettings = settingsService.get("brain");
      const apiKey = getApiKey();
      const baseUrl =
        brainSettings?.geminiBaseUrl || BRAIN_CONFIG.providers.gemini.baseUrl;

      const response = await fetch(
        `${baseUrl}/models/${this.model}:streamGenerateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens ?? this.maxTokens,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split("\n")
          .filter((l) => l.trim() && l.startsWith("data: "));

        for (const line of lines) {
          try {
            const json = JSON.parse(line.substring(6)); // Remove 'data: ' prefix
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Gemini streaming failed: ${error.message}`);
    }
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): Promise<string> {
    // Convert messages to Gemini format
    const contents = messages
      .filter((msg) => msg.role !== "system") // System messages go in systemInstruction
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

    const systemMessage = messages.find((msg) => msg.role === "system");

    const brainSettings = settingsService.get("brain");
    const apiKey = getApiKey();
    const baseUrl =
      brainSettings?.geminiBaseUrl || BRAIN_CONFIG.providers.gemini.baseUrl;

    try {
      const response = await fetch(
        `${baseUrl}/models/${this.model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens ?? this.maxTokens,
            },
            systemInstruction:
              systemMessage?.content || options?.systemPrompt
                ? {
                    parts: [
                      {
                        text:
                          systemMessage?.content || options?.systemPrompt || "",
                      },
                    ],
                  }
                : undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error: any) {
      throw new Error(`Gemini chat failed: ${error.message}`);
    }
  }
}

// --- OPENAI PROVIDER (PLACEHOLDER) ---
class OpenAIProvider implements LLMProvider {
  name = "openai";
  model: string;
  private apiKey: string;

  constructor(model: string = "gpt-4o", apiKey?: string) {
    this.model = model;
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  supportsFunctions = true;
  supportsStreaming = true;
  maxTokens = 4096;
  costPerToken = { input: 2.5, output: 10.0 }; // Approximate GPT-4o pricing

  async generate(
    prompt: string,
    options?: LLMGenerateOptions,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
      );
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? this.maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error: any) {
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }

  async *stream(
    prompt: string,
    options?: LLMGenerateOptions,
  ): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured.");
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? this.maxTokens,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI stream error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunks = decoder.decode(value).split("\n");
        for (const chunk of chunks) {
          if (chunk.startsWith("data: ")) {
            const dataStr = chunk.substring(6).trim();
            if (dataStr === "[DONE]") return;
            try {
              const json = JSON.parse(dataStr);
              const content = json.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch {
      throw new Error(`OpenAI streaming failed:`);
    }
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): Promise<string> {
    if (!this.apiKey) throw new Error("OpenAI API key not configured.");

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? this.maxTokens,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI chat error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch {
      throw new Error(`OpenAI chat failed:`);
    }
  }
}

// --- CLAUDE PROVIDER (PLACEHOLDER) ---
class ClaudeProvider implements LLMProvider {
  name = "claude";
  model: string;
  private apiKey: string;

  constructor(model: string = "claude-3-haiku-20240307", apiKey?: string) {
    this.model = model;
    this.apiKey =
      apiKey ||
      process.env.VITE_ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      "";
  }

  supportsFunctions = true;
  supportsStreaming = true;
  maxTokens = 4096;
  costPerToken = { input: 0.25, output: 1.25 }; // Claude 3 Haiku pricing

  async generate(
    prompt: string,
    options?: LLMGenerateOptions,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        "Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.",
      );
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          "dangerously-allow-browser": "true", // Required for frontend fetch to Anthropic
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? this.maxTokens,
          system: options?.systemPrompt,
          messages: [{ role: "user", content: prompt }],
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Anthropic API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      return data.content?.[0]?.text || "";
    } catch {
      throw new Error(`Anthropic generation failed:`);
    }
  }

  async *stream(
    prompt: string,
    options?: LLMGenerateOptions,
  ): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error("Anthropic API key not configured.");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          "dangerously-allow-browser": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? this.maxTokens,
          system: options?.systemPrompt,
          messages: [{ role: "user", content: prompt }],
          temperature: options?.temperature ?? 0.7,
          stream: true,
        }),
      });

      if (!response.ok)
        throw new Error(`Anthropic stream error: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.substring(6));
              if (json.type === "content_block_delta" && json.delta?.text) {
                yield json.delta.text;
              }
            } catch {
              // Ignore individual line parsing errors in stream to prevent interruption
            }
          }
        }
      }
    } catch {
      throw new Error(`Anthropic streaming failed:`);
    }
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): Promise<string> {
    if (!this.apiKey) throw new Error("Anthropic API key not configured.");

    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          "dangerously-allow-browser": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? this.maxTokens,
          system: systemMessage?.content || options?.systemPrompt,
          messages: chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok)
        throw new Error(`Anthropic chat error: ${response.status}`);

      const data = await response.json();
      return data.content?.[0]?.text || "";
    } catch {
      throw new Error(`Anthropic chat failed:`);
    }
  }
}

// --- OLLAMA PROVIDER (PLACEHOLDER) ---
export class OllamaProvider implements LLMProvider {
  name = "ollama";
  model: string;
  private baseUrl: string;

  constructor(model: string = "llama3.1", baseUrl?: string) {
    this.model = model;
    this.baseUrl =
      baseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  }

  supportsFunctions = false; // Ollama models typically don't support function calling
  supportsStreaming = true;
  maxTokens = 4096;
  costPerToken = { input: 0, output: 0 }; // Free (local)

  async generate(
    prompt: string,
    options?: LLMGenerateOptions,
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? this.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (error: any) {
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  async *stream(
    prompt: string,
    options?: LLMGenerateOptions,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: true,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? this.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) yield data.response;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Ollama streaming failed: ${error.message}`);
    }
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? this.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content || "";
    } catch (error: any) {
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }
}

// --- OPENROUTER PROVIDER ---
class OpenRouterProvider implements LLMProvider {
  name = "openrouter";
  model: string;
  private apiKey: string;

  constructor(model: string = "openrouter/auto", apiKey?: string) {
    this.model = model;
    this.apiKey = apiKey || process.env.VITE_OPENROUTER_API_KEY || "";
  }

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
    if (!this.apiKey) throw new Error("OpenRouter API key not configured.");
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://luca-os.com",
        "X-Title": "Luca OS Sovereign"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature ?? 0.7,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

// --- GROQ PROVIDER ---
class GroqProvider implements LLMProvider {
  name = "groq";
  model: string;
  private apiKey: string;

  constructor(model: string = "llama3-70b-8192", apiKey?: string) {
    this.model = model;
    this.apiKey = apiKey || process.env.VITE_GROQ_API_KEY || "";
  }

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
    if (!this.apiKey) throw new Error("Groq API key not configured.");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature ?? 0.7,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

// --- LLM SERVICE MANAGER ---
class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string = "gemini";
  private defaultModel: string = BRAIN_CONFIG.defaults.brain;
  private preferredModel: string | null = null;
  private preferredProvider: string | null = null;

  constructor() {
    // Initialize Gemini (current default)
    this.registerProvider(new GeminiProvider(this.defaultModel));

    // Register providers dynamically based on availability
    const openaiKey =
      process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.registerProvider(new OpenAIProvider("gpt-4o", openaiKey));
    }

    const anthropicKey =
      process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.registerProvider(
        new ClaudeProvider("claude-3-5-sonnet-20241022", anthropicKey),
      );
    }

    if (process.env.VITE_OLLAMA_BASE_URL || process.env.OLLAMA_BASE_URL) {
      this.registerProvider(new OllamaProvider("llama3.1"));
    }

    const openRouterKey = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      this.registerProvider(new OpenRouterProvider("openrouter/auto", openRouterKey));
    }

    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (groqKey) {
      this.registerProvider(new GroqProvider("llama3-70b-8192", groqKey));
    }
  }

  registerProvider(provider: LLMProvider) {
    this.providers.set(provider.name, provider);
    console.log(
      `[LLM_SERVICE] Registered provider: ${provider.name} (${provider.model})`,
    );
  }

  getProvider(name?: string): LLMProvider {
    let providerName = name || this.preferredProvider || this.defaultProvider;

    // --- BODY AWARENESS CHECK ---
    // If we are asking for Ollama but the sentinel says her neural organs are restricted, fallback immediately.
    if (providerName === "ollama") {
      const isOllamaOnline = environmentSentinel.getAwarenessPulse().includes("OLLAMA: OK");
      if (!isOllamaOnline) {
        console.warn("[LLM_SERVICE] Body Scan: Ollama is offline. Falling back to Cloud Synapse.");
        providerName = "openrouter"; // Prefer OpenRouter as the elite fallback
        if (!this.providers.has(providerName)) providerName = this.defaultProvider;
      }
    }

    const provider = this.providers.get(providerName);

    if (!provider) {
      console.warn(
        `[LLM_SERVICE] Provider "${providerName}" not found, falling back to "${this.defaultProvider}"`,
      );
      const fallback = this.providers.get(this.defaultProvider);
      if (fallback) return fallback;
      // Get first available provider as last resort
      const first = this.providers.values().next().value;
      if (!first) throw new Error("No LLM providers available");
      return first;
    }

    // Apply preferred model if this is the preferred provider and no model was specified
    if (!name && providerName === this.preferredProvider && this.preferredModel) {
      provider.model = this.preferredModel;
    }

    return provider;
  }

  setPreferredModel(modelId: string | null, providerName: string | null = "ollama") {
    this.preferredModel = modelId;
    this.preferredProvider = providerName;
    console.log(`[LLM_SERVICE] Preferred model set to: ${modelId} via ${providerName}`);
  }

  listProviders(): Array<{ name: string; model: string; available: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      model: p.model,
      available: true, // All registered providers are available
    }));
  }

  setDefaultProvider(name: string) {
    if (this.providers.has(name)) {
      this.defaultProvider = name;
      console.log(`[LLM_SERVICE] Default provider set to: ${name}`);
    } else {
      throw new Error(`Provider "${name}" not found`);
    }
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }

  // Fallback mechanism: try primary, then fallback to secondary
  async generateWithFallback(
    prompt: string,
    primaryProvider: string = this.defaultProvider,
    fallbackProvider: string = "gemini",
    options?: LLMGenerateOptions,
  ): Promise<{ text: string; provider: string }> {
    try {
      const provider = this.getProvider(primaryProvider);
      const text = await provider.generate(prompt, options);
      return { text, provider: primaryProvider };
    } catch (error: any) {
      console.warn(
        `[LLM_SERVICE] Primary provider "${primaryProvider}" failed: ${error.message}`,
      );
      console.log(`[LLM_SERVICE] Falling back to "${fallbackProvider}"`);

      const fallback = this.getProvider(fallbackProvider);
      const text = await fallback.generate(prompt, options);
      return { text, provider: fallbackProvider };
    }
  }

  async generate(
    prompt: string,
    options?: LLMGenerateOptions,
  ): Promise<string> {
    if (this.preferredModel && this.preferredProvider) {
      try {
        const provider = this.getProvider(this.preferredProvider);
        // Temporarily set model for this provider if it's dynamic like Ollama
        const originalModel = provider.model;
        provider.model = this.preferredModel;
        const result = await provider.generate(prompt, options);
        provider.model = originalModel; // Restore
        return result;
      } catch (error) {
        console.warn(`[LLM_SERVICE] Preferred model "${this.preferredModel}" failed, falling back to default.`, error);
      }
    }
    return this.getProvider().generate(prompt, options);
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): Promise<string> {
    const provider = this.getProvider();
    if (provider.chat) {
      return provider.chat(messages, options);
    }
    // Fallback if chat is not supported
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    return provider.generate(prompt, options);
  }

  setBrainModel(model: string) {
    const provider = this.providers.get("gemini");
    if (provider) {
      provider.model = model;
      console.log(`[LLM_SERVICE] Brain model set to: ${model}`);
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();
