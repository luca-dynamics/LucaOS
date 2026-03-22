import React from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import { PersonaType } from "../services/lucaService";

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
  return (
    <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
      {history.map((msg, idx) => {
        return (
          <ChatMessageBubble
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
        <div className="flex justify-start">
          <div className="flex gap-1 items-center bg-slate-800/50 rounded-lg px-3 py-2 border border-white/10 relative z-10">
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor, animationDelay: "75ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor, animationDelay: "150ms" }}
            />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWidgetHistory;
