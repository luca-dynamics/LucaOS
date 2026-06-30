import React from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import type { PersonaType } from "../services/lucaService";
import { MessageScroller, StreamingMarker } from "./chat/LucaConversationPrimitives";

interface ChatMessage {
  sender: "user" | "luca";
  text: string;
  attachment?: string | null;
  generatedImage?: string | null;
  generatedVideo?: string | null;
  isStreaming?: boolean;
  id?: string;
  tacticalData?: any;
}

interface ChatWidgetHistoryProps {
  history: ChatMessage[];
  isProcessing: boolean;
  primaryColor: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  persona: PersonaType;
}

const ChatWidgetHistory: React.FC<ChatWidgetHistoryProps> = ({
  history,
  isProcessing,
  primaryColor,
  messagesEndRef,
  persona,
}) => {
  const anchorKey = `${history.length}:${history[history.length - 1]?.text ?? ""}:${isProcessing}`;
  const lastUserMessage = [...history]
    .reverse()
    .find((message) => message.sender === "user" && message.id);
  const lastUserMessageId = lastUserMessage?.id
    ? `message-${lastUserMessage.id}`
    : undefined;

  return (
    <MessageScroller
      anchorRef={messagesEndRef}
      anchorKey={anchorKey}
      restoreKey="mini-chat"
      restoreAnchorId={lastUserMessageId}
      turnAnchorId={lastUserMessageId}
      className="p-4 pb-24 space-y-6"
    >
      {history.map((msg, idx) => {
        return (
          <ChatMessageBubble
            messageId={msg.id ? `message-${msg.id}` : undefined}
            key={msg.id || idx}
            text={msg.text}
            sender={msg.sender}
            timestamp={Date.now()}
            persona={persona}
            primaryColor={primaryColor}
            isProcessing={isProcessing && idx === history.length - 1}
            attachment={msg.attachment}
            generatedImage={msg.generatedImage}
            isStreaming={msg.isStreaming}
            tacticalData={msg.tacticalData}
          />
        );
      })}

      {isProcessing && history.length === 0 && (
        <StreamingMarker color={primaryColor} />
      )}
      <div ref={messagesEndRef} />
    </MessageScroller>
  );
};

export default ChatWidgetHistory;
