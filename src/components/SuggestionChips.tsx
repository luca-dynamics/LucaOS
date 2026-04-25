
import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";

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

  const isLight = theme?.isLight;
  const isLightCream = theme?.themeName?.toLowerCase() === "lightcream";

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
          className={`group flex-shrink flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-300 tech-border glass-blur ${
            isLight
              ? "shadow-sm hover:shadow-md"
              : "hover:bg-white/10"
          }`}
          style={{
            transitionDelay: `${index * 60}ms`,
            backgroundColor: isLight 
              ? `rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.4) * 0.5))`
              : `${themeHex}10`,
            borderColor: isLight ? "rgba(0,0,0,0.1)" : `${themeHex}33`,
            color: isLight ? (isLightCream ? "#4a483f" : "#334155") : "var(--app-text-main, rgba(234, 230, 230, 0.9))",
            borderWidth: "1px",
            borderStyle: "solid"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${themeHex}80`;
            e.currentTarget.style.boxShadow = `0 0 15px ${themeHex}20`;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.backgroundColor = isLight ? (isLightCream ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)") : `${themeHex}25`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isLight ? "rgba(0,0,0,0.1)" : `${themeHex}33`;
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.backgroundColor = isLight 
              ? `rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.4) * 0.5))`
              : `${themeHex}10`;
          }}
        >
          <span className="opacity-70 group-hover:opacity-100 transition-opacity duration-300" style={{ color: themeHex }}>
            {ICON_MAP[suggestion.icon] || <Icon name="Flash" size={10} />}
          </span>
          <span className="whitespace-nowrap tracking-tight font-bold uppercase text-[8px]">{suggestion.label}</span>
        </button>
      ))}

      {/* Optional: Dismiss All */}
      {suggestions.length > 2 && (
        <button
          onClick={onDismissAll}
          className={`text-[10px] font-bold uppercase tracking-widest opacity-20 hover:opacity-50 transition-opacity px-2 ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default SuggestionChips;
