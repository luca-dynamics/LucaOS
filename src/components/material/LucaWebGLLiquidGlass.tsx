import React, { useEffect, useRef, useState } from "react";
import {
  createLiquidGlassLensRenderer,
  type LiquidGlassLensRenderer,
} from "../presence/liquidGlassLensRenderer";
import { LucaLiquidGlassLayer, type LucaLiquidGlassDepth } from "./LucaLiquidGlass";

interface LucaWebGLLiquidGlassProps {
  /** A capture/image matching the pixels behind this surface. */
  background?: TexImageSource | null;
  backgroundRect?: [number, number, number, number];
  accent?: string;
  depth?: LucaLiquidGlassDepth;
  className?: string;
}

/**
 * Flagship optical tier. With a matching background it performs true shader
 * refraction; without one it deliberately reduces to the shared CSS optics.
 */
const LucaWebGLLiquidGlass: React.FC<LucaWebGLLiquidGlassProps> = ({
  background,
  backgroundRect = [0, 0, 1, 1],
  accent,
  depth = "hero",
  className = "",
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LiquidGlassLensRenderer | null>(null);
  const [fallback, setFallback] = useState(!background);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || !background) {
      setFallback(true);
      return;
    }

    const bounds = host.getBoundingClientRect();
    const renderer = createLiquidGlassLensRenderer(
      canvas,
      Math.max(bounds.width, bounds.height, 1),
      backgroundRect,
    );
    if (!renderer) {
      setFallback(true);
      return;
    }
    rendererRef.current = renderer;
    renderer.resize(bounds.width, bounds.height);
    renderer.setBackground(background);
    if (accent) renderer.setAccent(accent);
    setFallback(false);

    const resizeObserver = new ResizeObserver(([entry]) => {
      renderer.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(host);
    const onVisibility = () => renderer.setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [background, backgroundRect[0], backgroundRect[1], backgroundRect[2], backgroundRect[3], accent]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none ${className}`.trim()}
    >
      <canvas ref={canvasRef} className={fallback ? "hidden" : "h-full w-full"} />
      {fallback && <LucaLiquidGlassLayer depth={depth} />}
    </div>
  );
};

export default LucaWebGLLiquidGlass;
