
import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const {
  Sparkles,
  Scan,
  Clock,
  ListTodo,
  Globe,
  Mail,
  Brain,
  Eye,
  Zap,
  Link,
} = LucideIcons as any;

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
  scan: <Scan size={13} />,
  clock: <Clock size={13} />,
  list: <ListTodo size={13} />,
  globe: <Globe size={13} />,
  mail: <Mail size={13} />,
  brain: <Brain size={13} />,
  eye: <Eye size={13} />,
  zap: <Zap size={13} />,
  sparkles: <Sparkles size={13} />,
  link: <Link size={13} />,
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

  const isLight = 
    theme?.themeName?.toLowerCase() === "lucagent" || 
    theme?.themeName?.toLowerCase() === "agentic-slate" ||
    theme?.themeName?.toLowerCase() === "light";

  // Normalize theme color to ensure it has a hash (prevents browser fallback to white)
  let themeHex = theme?.hex || "#3b82f6";
  if (themeHex && !themeHex.startsWith("#") && !themeHex.startsWith("rgb") && !themeHex.startsWith("var")) {
    themeHex = `#${themeHex}`;
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${
        isDocked 
          ? "overflow-x-auto no-scrollbar whitespace-nowrap justify-start scroll-smooth" 
          : "flex-wrap justify-center"
      }`}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.id}
          onClick={() => onChipClick(suggestion.prompt)}
          className={`group flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300 ${
            isLight
              ? "bg-white/80 shadow-sm hover:bg-white hover:shadow-md"
              : "bg-white/5 hover:bg-white/10"
          }`}
          style={{
            transitionDelay: `${index * 60}ms`,
            borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)",
            color: isLight ? "#334155" : "rgba(234, 230, 230, 0.9)",
            borderWidth: "1px",
            borderStyle: "solid"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${themeHex}80`;
            e.currentTarget.style.boxShadow = `0 0 15px ${themeHex}20`;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.backgroundColor = isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.backgroundColor = isLight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.05)";
          }}
        >
          <span className="opacity-70 group-hover:opacity-100 transition-opacity duration-300" style={{ color: themeHex }}>
            {ICON_MAP[suggestion.icon] || <Zap size={12} />}
          </span>
          <span className="whitespace-nowrap tracking-tight">{suggestion.label}</span>
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
