
import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { lucaMaterialControlStyle } from "../styles/lucaMaterialSystem";

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
  onDismissAll: () => void;
  theme: any;
  visible: boolean;
  isDocked?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  scan: <Icon name="Magnifer" size={13} />,
  clock: <Icon name="ClockCircle" size={13} />,
  list: <Icon name="List" size={13} />,
  globe: <Icon name="Global" size={13} />,
  mail: <Icon name="Letter" size={13} />,
  brain: <Icon name="Cpu" size={13} />,
  eye: <Icon name="Eye" size={13} />,
  zap: <Icon name="Flash" size={13} />,
  sparkles: <Icon name="Stars" size={13} />,
  link: <Icon name="Link" size={13} />,
};

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onChipClick,
  onDismissAll,
  theme,
  visible,
  isDocked = false,
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

  // Normalize theme color to ensure it has a hash (prevents browser fallback to white)
  let themeHex = theme?.hex || "#3b82f6";
  if (themeHex && !themeHex.startsWith("#") && !themeHex.startsWith("rgb") && !themeHex.startsWith("var")) {
    themeHex = `#${themeHex}`;
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${
        isDocked 
          ? "w-full justify-center overflow-hidden" 
          : "flex-wrap justify-center"
      }`}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.id}
          onClick={() => onChipClick(suggestion.prompt)}
          className="luca-material-pressable group flex flex-shrink items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-[var(--luca-surface-hover)]"
          style={{
            ...lucaMaterialControlStyle,
            transitionDelay: `${index * 60}ms`,
          }}
        >
          <span className="opacity-70 group-hover:opacity-100 transition-opacity duration-300" style={{ color: themeHex }}>
            {ICON_MAP[suggestion.icon] || <Icon name="Flash" size={10} />}
          </span>
          <span className="whitespace-nowrap tracking-tight normal-case">{suggestion.label}</span>
        </button>
      ))}

      {/* Optional: Dismiss All */}
      {suggestions.length > 2 && (
        <button
          onClick={onDismissAll}
          className="px-2 text-[12px] font-medium normal-case text-[var(--luca-text-secondary)] opacity-60 transition-opacity hover:opacity-100"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default SuggestionChips;
