import React from "react";
import { Icon } from "./ui/Icon";

interface ChatWidgetHeaderProps {
  primaryColor: string;
  persona?: string;
  brainModel?: string;
  embeddingModel?: string;
  onClose: () => void;
}

const ChatWidgetHeader: React.FC<ChatWidgetHeaderProps> = ({
  primaryColor,
  brainModel,
  embeddingModel,
  onClose,
}) => {
  return (
    <div
      className="flex justify-between items-center px-4 py-2 border-b select-none text-[10px] font-mono transition-colors duration-500"
      style={{
        borderColor: `${primaryColor}20`,
        color: "var(--luca-text-secondary, rgba(255,255,255,0.7))",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Icon
            name="Code"
            size={10}
            color={`var(--luca-accent-primary, ${primaryColor})`}
          />
          <span
            style={{ color: `var(--luca-accent-primary, ${primaryColor})` }}
            className="tracking-widest font-semibold opacity-70 uppercase"
          >
            L.U.C.A MINI
          </span>
        </div>

        {/* Intelligence Context */}
        <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[var(--luca-surface-hover,rgba(255,255,255,0.05))] border border-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_5%,transparent)] opacity-45">
          <div className="flex items-center gap-1">
            <Icon name="Brain" size={8} color={primaryColor} />
            <span className="text-[8px] tracking-tight truncate max-w-[60px]">
              {brainModel?.toUpperCase() || "CORE"}
            </span>
          </div>
          <div className="w-[1px] h-2 bg-[color-mix(in_srgb,var(--luca-text-primary,#ffffff)_10%,transparent)]" />
          <div className="flex items-center gap-1">
            <Icon name="Database" size={8} color={primaryColor} />
            <span className="text-[8px] tracking-tight truncate max-w-[60px]">
              {embeddingModel?.toUpperCase() || "MEMORY"}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="hover:text-[var(--luca-text-primary,#ffffff)] transition-colors cursor-pointer z-[60]"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <Icon name="CloseCircle" size={12} />
      </button>
    </div>
  );
};

export default ChatWidgetHeader;
