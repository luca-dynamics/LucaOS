import React from "react";

export type LucaLiquidGlassShape = "circle" | "capsule" | "rounded" | "inherit";
export type LucaLiquidGlassDepth = "quiet" | "standard" | "hero";

export interface LucaLiquidGlassLayerProps {
  shape?: LucaLiquidGlassShape;
  depth?: LucaLiquidGlassDepth;
  className?: string;
}

/**
 * Optical-only layer for Luca's chromatic substrates. It never owns layout,
 * interaction, status colour, or content; those remain on the host surface.
 * This makes the same material safe to compose over an orb, face, or control.
 */
export const LucaLiquidGlassLayer: React.FC<LucaLiquidGlassLayerProps> = ({
  shape = "inherit",
  depth = "standard",
  className = "",
}) => (
  <span
    aria-hidden="true"
    className={`luca-liquid-glass__optics ${className}`.trim()}
    data-luca-glass-shape={shape}
    data-luca-glass-depth={depth}
  />
);

export interface LucaLiquidGlassSurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>, LucaLiquidGlassLayerProps {
  children: React.ReactNode;
}

/** A layout-neutral material host for flagship Luca surfaces. */
export const LucaLiquidGlassSurface = React.forwardRef<
  HTMLDivElement,
  LucaLiquidGlassSurfaceProps
>(({ children, shape = "inherit", depth = "standard", className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`luca-liquid-glass ${className}`.trim()}
    data-luca-glass-shape={shape}
    data-luca-glass-depth={depth}
    {...props}
  >
    {children}
    <LucaLiquidGlassLayer shape={shape} depth={depth} />
  </div>
));

LucaLiquidGlassSurface.displayName = "LucaLiquidGlassSurface";
