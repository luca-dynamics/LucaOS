import React, { useEffect, useRef, useState } from "react";
import {
  createLiquidGlassLensRenderer,
  type LiquidGlassLensRenderer,
} from "../presence/liquidGlassLensRenderer";
import { LucaLiquidGlassLayer, type LucaLiquidGlassDepth } from "./LucaLiquidGlass";
import type { LucaLiquidGlassTuning } from "../../styles/lucaOpticalMaterialSettings";

interface LucaWebGLLiquidGlassProps {
  /** A capture/image matching the pixels behind this surface. */
  background?: TexImageSource | null;
  backgroundRect?: [number, number, number, number];
  accent?: string;
  depth?: LucaLiquidGlassDepth;
  className?: string;
  tuning?: Partial<LucaLiquidGlassTuning>;
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
  tuning,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LiquidGlassLensRenderer | null>(null);
  const [fallback, setFallback] = useState(!background);
  const [contextEpoch, setContextEpoch] = useState(0);

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
    if (tuning) renderer.setTuning(tuning);
    setFallback(false);

    const resizeObserver = new ResizeObserver(([entry]) => {
      renderer.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(host);
    let isIntersecting = true;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const updatePause = () => renderer.setPaused(document.hidden || !isIntersecting || reducedMotion);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      updatePause();
    });
    intersectionObserver.observe(host);
    const onVisibility = () => updatePause();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setFallback(true);
    };
    const onContextRestored = () => setContextEpoch((epoch) => epoch + 1);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    updatePause();

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [
    background,
    backgroundRect[0],
    backgroundRect[1],
    backgroundRect[2],
    backgroundRect[3],
    accent,
    tuning?.light,
    tuning?.refraction,
    tuning?.depth,
    tuning?.dispersion,
    tuning?.frost,
    tuning?.edgeFalloff,
    contextEpoch,
  ]);

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
