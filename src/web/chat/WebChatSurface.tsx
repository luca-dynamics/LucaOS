import { useMemo, useState } from "react";
import LucaChatSurface, { type LucaChatMessage } from "../../components/chat/LucaChatSurface";
import { webAppRuntime } from "../runtime/webAppRuntime";
import type { WebChatMessage, WebChatRuntime } from "./webChatRuntime";

const welcomeMessage = (): WebChatMessage => ({
  id: "web-luca-welcome",
  role: "system",
  content: "Luca is ready. Ask anything or open a workspace.",
  timestamp: Date.now(),
});

interface WebChatSurfaceProps {
  runtime?: WebChatRuntime;
}

const toLucaMessage = (message: WebChatMessage): LucaChatMessage => ({
  id: message.id,
  role: message.role === "assistant" ? "luca" : message.role,
  content: message.content,
  timestamp: message.timestamp,
});

export function WebChatSurface({ runtime = webAppRuntime.chat }: WebChatSurfaceProps) {
  const initialMessages = useMemo(() => [welcomeMessage()], []);
  const [messages, setMessages] = useState<WebChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (value: string) => {
    const text = value.trim();
    if (!text || pending) return;

    const userMessage: WebChatMessage = {
      id: `web-user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const response = await runtime.sendMessage({
        messages: conversation,
        text,
        mode: "chat",
      });
      setMessages((current) => [...current, response]);
    } catch {
      setError("Luca is still connecting this route. You can continue setting up routes in Settings.");
    } finally {
      setPending(false);
    }
  };

  return (
    <LucaChatSurface
      messages={messages.map(toLucaMessage)}
      inputValue={input}
      onInputChange={setInput}
      onSend={send}
      pending={pending}
      errorLabel={error}
      primaryColor="var(--app-primary, #3b82f6)"
      persona="Luca"
      placeholder="Message Luca..."
      suggestions={[
        { id: "workspace", label: "Open a workspace", value: "Help me open a workspace" },
        { id: "routes", label: "Set up routes", value: "Help me set up my Luca routes" },
      ]}
      showSuggestions={messages.length <= 1}
    />
  );
}
