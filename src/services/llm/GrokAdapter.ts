import { OpenAIAdapter } from "./OpenAIAdapter";

export class GrokAdapter extends OpenAIAdapter {
  constructor(apiKey: string, modelName: string = "grok-beta", baseUrl?: string) {
    // Grok uses the OpenAI-compatible API at https://api.x.ai/v1 by default
    super(apiKey, modelName, baseUrl || "https://api.x.ai/v1");
    this.name = "xAI Grok";
  }
}
