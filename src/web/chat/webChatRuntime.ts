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
  "Luca Prime connection is preparing. Local and BYOK routes can be connected from Settings.";

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
