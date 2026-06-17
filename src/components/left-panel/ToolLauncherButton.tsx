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
      className="px-4 py-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-2.5 transition-all border glass-blur hover:opacity-90 active:opacity-100 touch-manipulation"
      style={{
        backgroundColor: isLight
          ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))"
          : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
        borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
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
          className="text-[9px] font-medium opacity-60"
          style={{ color: textColor }}
        >
          Preview
        </span>
      )}
    </button>
  );
};

export default ToolLauncherButton;
