export interface WebChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface WebChatRuntime {
  sendMessage(input: {
    messages: WebChatMessage[];
    text: string;
    mode?: "chat";
  }): Promise<WebChatMessage>;
}

export const WEB_CHAT_RUNTIME_UNAVAILABLE =
  "LucaOS web chat runtime is in browser-safe mode. Model execution adapter is not connected yet.";

export const webChatRuntime: WebChatRuntime = {
  async sendMessage() {
    return {
      id: `web-runtime-${Date.now()}`,
      role: "assistant",
      content: WEB_CHAT_RUNTIME_UNAVAILABLE,
      timestamp: Date.now(),
    };
  },
};
