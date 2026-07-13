import React from "react";
import { Icon } from "./ui/Icon";

interface WidgetControlsProps {
  isHovered: boolean;
  onExpand: () => void;
  onToggleHUD: () => void;
  isHUDActive: boolean;
}

const WidgetControls: React.FC<WidgetControlsProps> = ({
  isHovered,
  onExpand,
  onToggleHUD,
  isHUDActive,
}) => {
  if (!isHovered) return null;

  return (
    <div className="absolute top-0 right-0 p-2 flex flex-col gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleHUD();
        }}
        className={`p-2 rounded-full glass-blur border transition-all duration-300 ${
          isHUDActive
            ? "bg-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_15%,transparent)] border-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_30%,transparent)] text-[var(--luca-text-primary,#ffffff)]"
            : "bg-[var(--luca-surface-glass,rgba(0,0,0,0.4))] border-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_10%,transparent)] text-[var(--luca-text-tertiary,rgba(255,255,255,0.4))] hover:bg-[var(--luca-surface-hover,rgba(0,0,0,0.6))] hover:border-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_20%,transparent)] hover:text-[var(--luca-text-primary,#ffffff)]"
        }`}
        title={isHUDActive ? "Stop seeing screen" : "See screen"}
      >
        <Icon name="Monitor" size={14} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        className="p-2 rounded-full bg-[var(--luca-surface-glass,rgba(0,0,0,0.4))] glass-blur border border-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_10%,transparent)] text-[var(--luca-text-tertiary,rgba(255,255,255,0.4))] hover:bg-[var(--luca-surface-hover,rgba(0,0,0,0.6))] hover:border-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_20%,transparent)] hover:text-[var(--luca-text-primary,#ffffff)] transition-all duration-300"
        title="Open LucaOS"
      >
        <Icon name="Maximize2" size={14} />
      </button>
    </div>
  );
};

export default WidgetControls;
