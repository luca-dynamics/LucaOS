import OpenAI from "openai";
import { ModelProvider, ModelCapability, ProviderCapabilities, ProviderHealth, ProviderMetrics, ModelInvokeOptions } from "./ModelProvider";

export class OpenAIProviderAdapter implements ModelProvider {
  public id = "openai-gpt-4o";
  public name = "OpenAI GPT-4o Realtime";
  public capabilities = [
    ModelCapability.Streaming,
    ModelCapability.ToolCalling,
    ModelCapability.Vision,
    ModelCapability.FastLatency,
  ];
  public detailedCapabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    audioInput: true,
    audioOutput: true,
    jsonMode: true,
    reasoning: true,
    maxContextTokens: 128000,
    supportsCancellation: true,
  };
  public contextWindowTokens = 128000;

  private client?: OpenAI;
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private totalLatencyMs = 0;

  constructor(apiKey?: string) {
    const key = apiKey || globalThis.process?.env?.OPENAI_API_KEY;
    if (key) {
      this.client = new OpenAI({ apiKey: key });
    }
  }

  public async invoke(options: ModelInvokeOptions): Promise<string> {
    const startTime = Date.now();
    this.totalRequests++;

    if (!this.client) {
      // Offline fallback for local development without key
      this.successfulRequests++;
      this.totalLatencyMs += 110;
      return `[OpenAI Live Offline Adapter] Response for: ${options.prompt}`;
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          ...(options.systemPrompt ? [{ role: "system" as const, content: options.systemPrompt }] : []),
          { role: "user" as const, content: options.prompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      this.successfulRequests++;
      this.totalLatencyMs += Date.now() - startTime;
      return responseText;
    } catch (err) {
      this.failedRequests++;
      throw err;
    }
  }

  public async stream(
    options: ModelInvokeOptions,
    onToken: (token: string) => void
  ): Promise<string> {
    const startTime = Date.now();
    this.totalRequests++;

    if (!this.client) {
      // Local streaming demo when API key is unconfigured
      const tokens = ["I ", "checked ", "Abuja's ", "forecast; ", "heavy ", "rain ", "is ", "expected."];
      let fullText = "";
      for (const tok of tokens) {
        onToken(tok);
        fullText += tok;
        await new Promise((r) => setTimeout(r, 15));
      }
      this.successfulRequests++;
      this.totalLatencyMs += Date.now() - startTime;
      return fullText;
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          ...(options.systemPrompt ? [{ role: "system" as const, content: options.systemPrompt }] : []),
          { role: "user" as const, content: options.prompt },
        ],
        stream: true,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500,
      });

      let fullText = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          onToken(delta);
          fullText += delta;
        }
      }

      this.successfulRequests++;
      this.totalLatencyMs += Date.now() - startTime;
      return fullText;
    } catch (err) {
      this.failedRequests++;
      throw err;
    }
  }

  public getHealth(): ProviderHealth {
    return this.failedRequests > 3 ? "degraded" : "healthy";
  }

  public getMetrics(): ProviderMetrics {
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageLatencyMs: this.totalRequests > 0 ? this.totalLatencyMs / this.totalRequests : 0,
    };
  }
}
