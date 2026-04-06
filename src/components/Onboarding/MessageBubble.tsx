import React from "react";
import { Message } from "../../types/conversation";

interface MessageBubbleProps {
  message: Message;
  theme?: { primary: string; hex: string; themeName?: string };
}

/**
 * Message bubble component for conversation
 * Displays messages from Luca or User with glassmorphic styling
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isLuca = message.role === "luca";

  // Format timestamp
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div
      className={`flex ${
        isLuca
          ? "justify-start"
          : "justify-end"
      } animate-fade-in-up`}
    >
      <div
        className={`
          flex flex-col
          glass-blur
          border
        `}
        style={{
          maxWidth: "90%",
          borderRadius: "2vmin",
          padding: "2vmin",
          gap: "1vmin",
          backgroundColor: "var(--app-bg-tint)",
          borderColor: "var(--app-border-main)",
        }}
      >
        {/* Role label */}
        <div
          className="font-bold uppercase tracking-wider opacity-80"
          style={{ 
            fontSize: "clamp(0.5rem, 1.5vmin, 0.75rem)",
            color: isLuca ? "var(--app-text-muted)" : "var(--app-text-main)"
          }}
        >
          {isLuca ? "Luca" : "You"}
        </div>
 
        {/* Message content */}
        <div
          className="leading-relaxed whitespace-pre-wrap"
          style={{ 
            fontSize: "clamp(0.7rem, 2vmin, 0.9rem)",
            color: "var(--app-text-main)"
          }}
        >
          {message.content}
        </div>
 
        {/* Timestamp */}
        <div
          className="text-[10px] mt-2 opacity-60"
          style={{ color: "var(--app-text-muted)" }}
        >
          {getTimeAgo(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
