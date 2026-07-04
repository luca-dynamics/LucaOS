import React from "react";
import type { LeftPanelToolItem } from "./leftPanelModel";

interface ToolLauncherButtonProps {
  tool: LeftPanelToolItem;
  isLight: boolean;
  isLightCream: boolean;
  onSelect: (tool: LeftPanelToolItem) => void;
}

/**
 * Single launcher row for the TOOLS rail (panel-interiors-target): a quiet
 * row — dim tone dot, plain label — never a chip cloud. No resting-state
 * accent colours (risk shows in the tool's own surface, not as a red badge
 * in the rail). Rendering never triggers an action — only the onClick does.
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
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[rgba(127,127,127,0.09)]"
    >
      <span
        className="h-1.5 w-1.5 flex-none rounded-full"
        style={{ background: "var(--luca-border-strong, rgba(255,255,255,0.18))" }}
        aria-hidden="true"
      />
      <span
        className="min-w-0 truncate text-[12.5px]"
        style={{ color: "var(--luca-text-secondary, var(--app-text-muted))" }}
      >
        {tool.label}
      </span>
      {tool.preview && (
        <span
          className="ml-auto flex-none text-[10.5px]"
          style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
        >
          preview
        </span>
      )}
    </button>
  );
};

export default ToolLauncherButton;
