import React from "react";
import { Terminal, X } from "lucide-react";

interface ChatWidgetHeaderProps {
  primaryColor: string;
  persona?: string;
  onClose: () => void;
}

const ChatWidgetHeader: React.FC<ChatWidgetHeaderProps> = ({
  primaryColor,
  persona,
  onClose,
}) => {
  return (
    <div
      className="flex justify-between items-center px-4 py-2 border-b select-none text-[10px] font-mono transition-colors duration-500"
      style={{ borderColor: `${primaryColor}20` }}
    >
      <div className="flex items-center gap-2">
        <Terminal
          size={10}
          color={primaryColor === "#111827" ? "#ffffff" : primaryColor}
        />
        <span
          style={{
            color: primaryColor === "#111827" ? "#ffffff" : primaryColor,
          }}
          className="tracking-widest font-bold opacity-80"
        >
          L.U.C.A MINI{" "}
          {persona && (
            <span className="opacity-40 font-normal">[{persona}]</span>
          )}
        </span>
      </div>
      <button
        onClick={onClose}
        className="hover:text-white transition-colors cursor-pointer z-[60]"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <X size={12} />
      </button>
    </div>
  );
};

export default ChatWidgetHeader;
