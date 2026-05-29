import React from "react";
import { Icon } from "../ui/Icon";
import type { LeftPanelToolItem } from "./leftPanelModel";

interface ToolLauncherButtonProps {
  tool: LeftPanelToolItem;
  isLight: boolean;
  isLightCream: boolean;
  onSelect: (tool: LeftPanelToolItem) => void;
}

/**
 * Single launcher button for the TOOLS rail. Rendering never triggers an
 * action — only the onClick does, and it just forwards to the existing
 * callback the sidebar wires up.
 */
const ToolLauncherButton: React.FC<ToolLauncherButtonProps> = ({
  tool,
  isLight,
  isLightCream,
  onSelect,
}) => {
  const textColor = tool.accentColor
    ? tool.accentColor
    : isLightCream
      ? "#4a483f"
      : "var(--app-text-main)";

  return (
    <button
      type="button"
      onClick={() => onSelect(tool)}
      title={tool.description || tool.label}
      className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur hover:scale-105 active:scale-95 shadow-lg shadow-black/20 touch-manipulation"
      style={{
        backgroundColor: isLight
          ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))"
          : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
        color: textColor,
      }}
    >
      <Icon
        name={tool.icon}
        size={14}
        variant="BoldDuotone"
        color={tool.accentColor}
      />
      {tool.label}
      {tool.preview && (
        <span
          className="text-[8px] font-bold tracking-[0.15em] opacity-60"
          style={{ color: textColor }}
        >
          PREVIEW
        </span>
      )}
    </button>
  );
};

export default ToolLauncherButton;
