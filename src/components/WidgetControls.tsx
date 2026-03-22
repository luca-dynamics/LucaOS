import React from "react";
import * as LucideIcons from "lucide-react";
const { Monitor, Maximize2 } = LucideIcons as any;

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
        className={`p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${
          isHUDActive
            ? "bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            : "bg-black/40 border-white/10 text-white/40 hover:bg-black/60 hover:border-white/20 hover:text-white"
        }`}
        title={isHUDActive ? "Dismiss Smart Screen" : "Summon Smart Screen"}
      >
        <Monitor size={14} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/40 hover:bg-black/60 hover:border-white/20 hover:text-white transition-all duration-300"
        title="Expand to Dashboard"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
};

export default WidgetControls;
