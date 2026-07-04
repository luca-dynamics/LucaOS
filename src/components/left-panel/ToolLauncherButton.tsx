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
 * A single tool chip. Compact icon + label that tiles into a wrapped grid
 * per group (the original grouped layout), kept in the calm skin — hairline
 * border, secondary text, quiet hover — rather than the old loud glass or a
 * flat one-per-row list. Rendering never triggers an action; only onClick.
 */
const ToolLauncherButton: React.FC<ToolLauncherButtonProps> = ({
  tool,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(tool)}
      title={tool.description || tool.label}
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors hover:bg-[rgba(127,127,127,0.09)]"
      style={{
        borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.07))",
        color: "var(--luca-text-secondary, var(--app-text-muted))",
      }}
    >
      <Icon
        name={tool.icon}
        size={13}
        variant="BoldDuotone"
        className="flex-none opacity-70"
      />
      <span className="truncate">{tool.label}</span>
      {tool.preview && (
        <span
          className="flex-none text-[9.5px] opacity-60"
          style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
        >
          preview
        </span>
      )}
    </button>
  );
};

export default ToolLauncherButton;
