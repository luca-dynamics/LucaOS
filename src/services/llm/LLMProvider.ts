export interface ToolCall {
  name: string;
  args: any;
  id?: string; // For OpenAI/Anthropic mapping
}

export interface ChatMessage {
  role: "user" | "model" | "tool" | "system";
  content?: string;
  thought?: string; // Captures internal reasoning
  thought_signature?: string; // Captures cryptographic signature for tool calls
  toolCalls?: ToolCall[];
  toolCallId?: string; // For tool responses
  name?: string; // For tool responses
}

export interface LLMResponse {
  text: string;
  thought?: string;
  thought_signature?: string;
  toolCalls?: ToolCall[];
}

export interface LLMProvider {
  name: string;
  generateContent(prompt: string, images?: string[]): Promise<string>;
  chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[]
  ): Promise<LLMResponse>;
  streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string>;
  embed?(text: string): Promise<number[]>;
  embedBatch?(texts: string[]): Promise<number[][]>;
}
