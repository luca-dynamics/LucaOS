import { OpenAIAdapter } from "./OpenAIAdapter";

export class DeepSeekAdapter extends OpenAIAdapter {
  constructor(apiKey: string, modelName: string = "deepseek-chat") {
    // DeepSeek uses an OpenAI-compatible API at https://api.deepseek.com/v1
    super(apiKey, modelName, "https://api.deepseek.com/v1");
    this.name = "DeepSeek";
  }
}
