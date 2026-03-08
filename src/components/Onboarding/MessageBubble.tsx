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
  const isLight = theme?.hex === "#111827" || theme?.themeName === "lucagent";

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
        max-w-[85%] lg:max-w-none lg:w-full
        rounded-2xl 
        p-3 sm:p-4 lg:p-5
        backdrop-blur-xl
        ${
          isLuca
            ? isLight
              ? "bg-black/10 border border-black/20"
              : "bg-white/10 border border-white/20"
            : isLight
              ? "bg-blue-600/10 border border-blue-500/20"
              : "bg-blue-500/20 border border-blue-400/30"
        }
      `}
      >
        {/* Role label */}
        <div
          className={`text-xs font-bold uppercase tracking-wider mb-2 ${
            isLuca
              ? isLight
                ? "text-black/60"
                : "text-white/80"
              : isLight
                ? "text-blue-700/80"
                : "text-blue-300/80"
          }`}
        >
          {isLuca ? "Luca" : "You"}
        </div>

        {/* Message content */}
        <div
          className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-2 ${
            isLight ? "text-black/60" : "text-white/60"
          }`}
        >
          {getTimeAgo(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
