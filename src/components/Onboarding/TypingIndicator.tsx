import React from "react";

/**
 * Typing indicator for when Luca is processing
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className="bg-white/5 border glass-blur rounded-2xl px-5 py-3 flex items-center gap-2"
        style={{ borderColor: "var(--app-border-main)" }}
      >
        <span 
          className="text-xs font-medium"
          style={{ color: "var(--app-text-muted)" }}
        >
          Luca is typing
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                backgroundColor: "var(--app-text-main)",
                animationDelay: `${i * 0.15}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
