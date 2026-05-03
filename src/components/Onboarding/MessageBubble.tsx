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
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, theme }) => {
  const isLuca = message.role === "luca";
  const accent = theme?.hex || "var(--app-primary)";

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
          ? "justify-start lg:justify-center"
          : "justify-end lg:justify-center"
      } animate-fade-in-up`}
    >
      <div
        className={`
          flex flex-col
          glass-blur
          border
          max-w-[85%] lg:max-w-none lg:w-full
          rounded-2xl
          p-3 sm:p-4 lg:p-5
        `}
        style={{
          backgroundColor: isLuca
            ? "var(--app-bg-tint)"
            : `${accent}1a`,
          borderColor: isLuca
            ? "var(--app-border-main)"
            : `${accent}55`,
        }}
      >
        {/* Role label */}
        <div
          className="text-xs font-bold uppercase tracking-wider mb-2"
          style={{
            color: isLuca ? "var(--app-text-muted)" : accent,
          }}
        >
          {isLuca ? "Luca" : "You"}
        </div>
 
        {/* Message content */}
        <div
          className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--app-text-main)" }}
        >
          {message.content}
        </div>
 
        {/* Timestamp */}
        <div
          className="text-[10px] mt-2"
          style={{ color: "var(--app-text-muted)" }}
        >
          {getTimeAgo(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
