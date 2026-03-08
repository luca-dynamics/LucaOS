
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Scan,
  Clock,
  ListTodo,
  Globe,
  Mail,
  Brain,
  Eye,
  Zap,
} from "lucide-react";

export interface Suggestion {
  id: string;
  label: string;
  icon: string; // lucide icon name
  prompt: string; // what to send to Luca when clicked
  category: "system" | "productivity" | "awareness" | "social";
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onChipClick: (prompt: string) => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  theme: any;
  visible: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  scan: <Scan size={13} />,
  clock: <Clock size={13} />,
  list: <ListTodo size={13} />,
  globe: <Globe size={13} />,
  mail: <Mail size={13} />,
  brain: <Brain size={13} />,
  eye: <Eye size={13} />,
  zap: <Zap size={13} />,
  sparkles: <Sparkles size={13} />,
};

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onChipClick,
  onDismiss,
  onDismissAll,
  theme,
  visible,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible && suggestions.length > 0) {
      // Stagger entrance
      const timer = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [visible, suggestions.length]);

  if (!visible || suggestions.length === 0) return null;

  const isLight = theme?.themeName === "lucagent";
  const themeHex = theme?.hex || "#3b82f6";

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0 overflow-y-hidden overflow-x-auto [&::-webkit-scrollbar]:hidden transition-all duration-500 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* Luca indicator (Icon only now) */}
      <div
        className="flex items-center justify-center shrink-0 opacity-40 mr-1"
        style={{ color: themeHex }}
        title="Suggestions"
      >
        <Sparkles size={11} className="animate-pulse" />
      </div>

      {/* Chip list forced to single line */}
      <div
        className="flex items-center gap-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden items-center py-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            onClick={() => onChipClick(suggestion.prompt)}
            className={`group flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium tracking-wide transition-all duration-300 shrink-0 border ${
              isLight
                ? "bg-white/60 border-gray-200/80 text-gray-700 hover:bg-white/90 hover:shadow-md"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/15 hover:border-white/25 hover:text-white"
            }`}
            style={{
              transitionDelay: `${index * 80}ms`,
              transform: mounted ? "scale(1)" : "scale(0.9)",
              opacity: mounted ? 1 : 0,
            }}
          >
            <span style={{ color: themeHex }}>
              {ICON_MAP[suggestion.icon] || <Zap size={9} />}
            </span>
            <span className="whitespace-nowrap">{suggestion.label}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(suggestion.id);
              }}
              className={`rounded-full p-0.5 transition-colors flex items-center justify-center ${
                isLight
                  ? "hover:bg-gray-200/80 text-gray-400"
                  : "hover:bg-white/20 text-white/30"
              }`}
            >
              <X size={8} />
            </span>
          </button>
        ))}
      </div>

      {/* Dismiss all */}
      {suggestions.length > 1 && (
        <button
          onClick={onDismissAll}
          className={`text-[8px] font-bold uppercase tracking-widest shrink-0 px-1.5 py-0.5 flex items-center rounded transition-colors ml-auto ${
            isLight
              ? "text-gray-400 hover:text-gray-600"
              : "text-white/30 hover:text-white/60"
          }`}
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default SuggestionChips;
