import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Anchor } from "lucide-react";
import { getThemeColors } from "../../config/themeColors";

interface FloatingPanelProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  themeColor?: string; // App.tsx passes this
  theme?: any; // Fallback or explicit theme object
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  onReattach?: () => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
  onClose,
  title,
  children,
  theme = getThemeColors(),
  defaultWidth = 400,
  defaultHeight = 600,
  defaultX = 100,
  defaultY = 100,
  onReattach,
}) => {
  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        initial={{
          opacity: 0,
          scale: 0.9,
          x: defaultX,
          y: defaultY,
          width: defaultWidth,
          height: defaultHeight,
        }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        className={`fixed z-[100] flex flex-col overflow-hidden border shadow-2xl ${
          theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"
        }`}
        style={{
          borderColor: `${theme.hex}44`,
          background:
            theme.themeName?.toLowerCase() === "lucagent"
              ? "rgba(255, 255, 255, 0.5)"
              : "rgba(0, 0, 0, 0.4)",
          resize: "both",
          minWidth: "300px",
          minHeight: "400px",
        }}
      >
        {/* Header / Drag Handle */}
        <div
          className="flex items-center justify-between p-3 border-b cursor-move select-none"
          style={{ borderColor: `${theme.hex}22` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: theme.hex }}
            />
            <span
              className={`text-[10px] font-bold tracking-widest uppercase ${theme.primary}`}
            >
              {title} [DETACHED]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReattach}
              className="p-1 hover:bg-white/10 rounded transition-colors group"
              title="Re-attach to Main Layout"
            >
              <Anchor
                size={14}
                className="text-slate-400 group-hover:text-white"
              />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 rounded transition-colors group"
              title="Close Panel"
            >
              <X
                size={14}
                className="text-slate-400 group-hover:text-red-400"
              />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">{children}</div>

        {/* Resize Corner Indicator */}
        <div
          className="absolute bottom-1 right-1 pointer-events-none opacity-40"
          style={{ color: theme.hex }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M11 1L1 11M11 5L5 11M11 9L9 11"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingPanel;
