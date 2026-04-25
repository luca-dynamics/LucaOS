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
      style={{ borderColor: `${primaryColor}20` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Icon
            name="Code"
            size={10}
            color={
              primaryColor === "#111827" || primaryColor === "#000000"
                ? "#ffffff"
                : primaryColor
            }
          />
          <span
            style={{
              color:
                primaryColor === "#111827" || primaryColor === "#000000"
                  ? "#ffffff"
                  : primaryColor,
            }}
            className="tracking-widest font-bold opacity-80 uppercase"
          >
            L.U.C.A MINI
          </span>
        </div>

        {/* Intelligence Context */}
        <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-white/5 border border-white/5 opacity-60">
          <div className="flex items-center gap-1">
            <Icon name="Brain" size={8} color={primaryColor} />
            <span className="text-[8px] tracking-tight truncate max-w-[60px]">
              {brainModel?.toUpperCase() || "CORE"}
            </span>
          </div>
          <div className="w-[1px] h-2 bg-white/10" />
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
        className="hover:text-white transition-colors cursor-pointer z-[60]"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <Icon name="CloseCircle" size={12} />
      </button>
    </div>
  );
};

export default ChatWidgetHeader;
