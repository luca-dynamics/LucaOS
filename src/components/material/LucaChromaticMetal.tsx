import React, { useEffect, useRef, useState } from "react";
import {
  createChromaticMetalRenderer,
  type LucaChromaticMetalShape,
} from "../presence/chromaticMetalRenderer";
import type { LucaChromaticMetalTuning } from "../../styles/lucaOpticalMaterialSettings";

interface LucaChromaticMetalProps {
  shape?: LucaChromaticMetalShape;
  tuning?: Partial<LucaChromaticMetalTuning>;
  className?: string;
}

/** Reusable shader substrate. Geometry is masked in the fragment shader. */
export const LucaChromaticMetal: React.FC<LucaChromaticMetalProps> = ({
  shape = "orb",
  tuning,
  className = "",
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [contextEpoch, setContextEpoch] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const renderer = createChromaticMetalRenderer(canvas, shape);
    if (!renderer) {
      setFailed(true);
      return;
    }
    setFailed(false);
    renderer.setShape(shape);
    if (tuning) renderer.setTuning(tuning);
    const resize = new ResizeObserver(([entry]) => renderer.resize(entry.contentRect.width, entry.contentRect.height));
    resize.observe(host);
    const bounds = host.getBoundingClientRect();
    renderer.resize(bounds.width, bounds.height);
    let visible = true;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const updatePause = () => renderer.setPaused(document.hidden || !visible || reducedMotion);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updatePause();
    });
    intersection.observe(host);
    const onContextLost = (event: Event) => { event.preventDefault(); setFailed(true); };
    const onContextRestored = () => setContextEpoch((value) => value + 1);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    document.addEventListener("visibilitychange", updatePause);
    updatePause();
    return () => {
      resize.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", updatePause);
      renderer.dispose();
    };
  }, [
    shape,
    tuning?.rounding,
    tuning?.depth,
    tuning?.roughness,
    tuning?.rgbSplit,
    tuning?.scale,
    tuning?.stretch,
    tuning?.angle,
    tuning?.repeats,
    tuning?.offset,
    tuning?.phase,
    tuning?.evolution,
    tuning?.gradient,
    contextEpoch,
  ]);

  return (
    <div ref={hostRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`.trim()}>
      <canvas ref={canvasRef} className={failed ? "hidden" : "h-full w-full"} />
      {failed && <div className="absolute inset-0 bg-[var(--luca-background-liquid)] opacity-80" />}
    </div>
  );
};

export default LucaChromaticMetal;
