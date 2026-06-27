import { useRef, useState } from "react";
import ChatPanel from "../../components/layout/ChatPanel";
import { Sender } from "../../types";
import { webAppRuntime } from "../runtime/webAppRuntime";

/**
 * WebRealChatPanel — mounts the REAL desktop ChatPanel in the browser-safe web
 * build (real-app track). Instead of a bespoke web chat surface, the web app
 * now renders the same ChatPanel the desktop uses; this container only supplies
 * the props ChatPanel expects, with browser-safe state + handlers:
 *
 * - message state is local; sending routes through webAppRuntime.chat (the
 *   configured OpenAI-compatible cloud endpoint, with honest fallbacks)
 * - desktop-only affordances that need native/secure runtimes (camera, screen
 *   share, voice, file attach) are inert no-ops here until shimmed
 *
 * ChatPanel's own service imports (settingsService, etc.) already guard on
 * `typeof window` / localStorage and degrade in the browser, so the real
 * component mounts without the native chain.
 */

interface WebChatMessageModel {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isHidden?: boolean;
}

const welcome = (): WebChatMessageModel => ({
  id: "web-luca-welcome",
  text: "Luca is ready. Ask anything or open a workspace.",
  sender: Sender.SYSTEM,
  timestamp: Date.now(),
});

const toRuntimeRole = (sender: Sender): "user" | "assistant" | "system" =>
  sender === Sender.USER ? "user" : sender === Sender.SYSTEM ? "system" : "assistant";

const noop = () => {};

export function WebRealChatPanel() {
  const [messages, setMessages] = useState<WebChatMessageModel[]>(() => [welcome()]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;
    const userMessage: WebChatMessageModel = {
      id: `web-user-${Date.now()}`,
      text: trimmed,
      sender: Sender.USER,
      timestamp: Date.now(),
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput("");
    setIsProcessing(true);
    try {
      const reply = await webAppRuntime.chat.sendMessage({
        messages: conversation.map((m) => ({
          id: m.id,
          role: toRuntimeRole(m.sender),
          content: m.text,
          timestamp: m.timestamp,
        })),
        text: trimmed,
        mode: "chat",
      });
      setMessages((current) => [
        ...current,
        { id: reply.id, text: reply.content, sender: Sender.LUCA, timestamp: reply.timestamp },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ChatPanel
      messages={messages}
      isMobile={false}
      activeMobileTab=""
      theme={{ hex: "var(--luca-accent-primary)", primary: "PROFESSIONAL" }}
      isProcessing={isProcessing}
      persona="PROACTIVE"
      chatEndRef={chatEndRef}
      handleSendMessage={async (text: string) => {
        await send(text);
      }}
      setAmbientSuggestions={noop}
      ambientSuggestions={[]}
      showSuggestionChips={false}
      setShowSuggestionChips={noop}
      showVoiceHud={false}
      bootSequence="READY"
      currentCwd=""
      isKernelLocked={false}
      opsecStatus="ACTIVE"
      attachedImage={null}
      setAttachedImage={noop}
      fileInputRef={fileInputRef}
      handleFileSelect={noop}
      input={input}
      setInput={setInput}
      handleSend={() => {
        void send(input);
      }}
      isVoiceMode={false}
      toggleVoiceMode={noop}
      showCamera={false}
      setShowCamera={noop}
      handleScreenShare={noop}
      handleClearChat={() => setMessages([welcome()])}
      handleStop={() => setIsProcessing(false)}
      setMessages={setMessages as React.Dispatch<React.SetStateAction<unknown[]>>}
    />
  );
}

export default WebRealChatPanel;
