import { OpenAIAdapter } from "./OpenAIAdapter";

export class GrokAdapter extends OpenAIAdapter {
  constructor(apiKey: string, modelName: string = "grok-beta") {
    // Grok uses the OpenAI-compatible API at https://api.x.ai/v1
    super(apiKey, modelName, "https://api.x.ai/v1");
    this.name = "xAI Grok";
  }
}
