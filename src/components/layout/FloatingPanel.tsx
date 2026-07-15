import React, { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Anchor, X } from "lucide-react";
import {
  LucaIcon,
  LucaIconButton,
  LucaPanelActions,
  LucaPanelContent,
  LucaPanelHeader,
  LucaPanelTitle,
  LucaTooltip,
  lucaLayerStyle,
} from "../ui/luca";
import { getThemeColors } from "../../config/themeColors";
import { lucaMaterialFloatingPanelStyle } from "../../styles/lucaMaterialSystem";
import {
  LUCA_DRAG_INERTIA,
  resolveLucaSurfaceMotion,
  resolveLucaViewportDragConstraints,
} from "../../styles/lucaFluidMotion";

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
  const reducedMotion = useReducedMotion() ?? false;
  const titleId = useId();
  const surfaceMotion = resolveLucaSurfaceMotion(reducedMotion);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragConstraints, setDragConstraints] = useState(() =>
    resolveLucaViewportDragConstraints({
      viewportWidth: typeof window === "undefined" ? defaultX + defaultWidth : window.innerWidth,
      viewportHeight:
        typeof window === "undefined" ? defaultY + defaultHeight : window.innerHeight,
      panelWidth: defaultWidth,
      panelHeight: defaultHeight,
      originX: defaultX,
      originY: defaultY,
    }),
  );

  useEffect(() => {
    const updateConstraints = () => {
      const panel = panelRef.current;
      if (!panel) return;
      setDragConstraints(
        resolveLucaViewportDragConstraints({
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          panelWidth: panel.offsetWidth,
          panelHeight: panel.offsetHeight,
          originX: defaultX,
          originY: defaultY,
        }),
      );
    };

    updateConstraints();
    window.addEventListener("resize", updateConstraints);
    const observer = new ResizeObserver(updateConstraints);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => {
      window.removeEventListener("resize", updateConstraints);
      observer.disconnect();
    };
  }, [defaultX, defaultY]);

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        drag
        dragConstraints={dragConstraints}
        dragMomentum={!reducedMotion}
        dragTransition={LUCA_DRAG_INERTIA}
        dragElastic={0.08}
        initial={{
          opacity: surfaceMotion.initial.opacity,
          scale: surfaceMotion.initial.scale,
          x: defaultX,
          y: defaultY,
          width: defaultWidth,
          height: defaultHeight,
        }}
        animate={{
          opacity: surfaceMotion.animate.opacity,
          scale: surfaceMotion.animate.scale,
        }}
        exit={{
          opacity: surfaceMotion.exit.opacity,
          scale: surfaceMotion.exit.scale,
        }}
        transition={surfaceMotion.transition}
        role="region"
        aria-labelledby={titleId}
        className={`fixed flex flex-col overflow-hidden border shadow-2xl ${
          theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"
        }`}
        style={{
          ...lucaMaterialFloatingPanelStyle,
          ...lucaLayerStyle("panel"),
          resize: "both",
          minWidth: "300px",
          minHeight: "400px",
        }}
      >
        {/* Header / Drag Handle */}
        <LucaPanelHeader
          className="flex items-center justify-between p-3 border-b cursor-move select-none"
          style={{ borderColor: `${theme.hex}22` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: theme.hex }}
            />
            <LucaPanelTitle
              id={titleId}
              className={`text-[10px] font-bold tracking-widest uppercase ${theme.primary}`}
            >
              {title} [DETACHED]
            </LucaPanelTitle>
          </div>

          <LucaPanelActions>
            <LucaTooltip label="Re-attach to main layout">
            <LucaIconButton
              onClick={onReattach}
              aria-label="Re-attach to main layout"
              variant="ghost"
            >
              <LucaIcon
                icon={Anchor}
                className="text-[color:var(--app-text-muted)] group-hover:text-[color:var(--app-text-main)]"
              />
            </LucaIconButton>
            </LucaTooltip>
            <LucaTooltip label="Close panel">
            <LucaIconButton
              onClick={onClose}
              aria-label="Close panel"
              variant="danger"
            >
              <LucaIcon
                icon={X}
                className="text-[color:var(--app-text-muted)] group-hover:text-[var(--luca-danger,#f87171)]"
              />
            </LucaIconButton>
            </LucaTooltip>
          </LucaPanelActions>
        </LucaPanelHeader>

        {/* Content Area */}
        <LucaPanelContent className="relative overflow-hidden">{children}</LucaPanelContent>

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
