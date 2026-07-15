import React, { useEffect, useRef, useState } from "react";
import LucaWebGLLiquidGlass from "../material/LucaWebGLLiquidGlass";
import LucaChromaticMetal from "../material/LucaChromaticMetal";
import type { LucaOpticalMaterialSettings } from "../../styles/lucaOpticalMaterialSettings";

interface OpticalMaterialPreviewProps {
  value: LucaOpticalMaterialSettings;
  accentColor: string;
}

/** A true matched-background lab: the visible canvas is the lens texture. */
export const OpticalMaterialPreview: React.FC<OpticalMaterialPreviewProps> = ({ value, accentColor }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const draw = (width: number, height: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(dpr, dpr);
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#172027");
      gradient.addColorStop(0.48, accentColor);
      gradient.addColorStop(1, "#eadfd0");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(255,255,255,.72)";
      context.font = "600 14px Inter, system-ui, sans-serif";
      context.fillText("LUCA OPTICAL FIELD", 18, 28);
      context.fillStyle = "rgba(10,16,20,.46)";
      context.fillRect(width * 0.62, 0, 1, height);
      setRevision((value) => value + 1);
    };
    const resize = new ResizeObserver(([entry]) => draw(entry.contentRect.width, entry.contentRect.height));
    resize.observe(host);
    const bounds = host.getBoundingClientRect();
    draw(bounds.width, bounds.height);
    return () => resize.disconnect();
  }, [accentColor]);

  return (
    <div ref={hostRef} className="relative mb-4 h-40 overflow-hidden rounded-[var(--luca-radius-lg,18px)] border" style={{ borderColor: "var(--luca-border-subtle)" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {canvasRef.current && (
        <LucaWebGLLiquidGlass
          key={revision}
          background={canvasRef.current}
          accent={accentColor}
          tuning={value.glass}
        />
      )}
      <div className="absolute bottom-4 right-4 z-10 h-10 w-28 overflow-hidden rounded-full border border-white/30 shadow-lg">
        <LucaChromaticMetal shape="capsule" tuning={value.metal} />
        <span className="relative z-10 flex h-full items-center justify-center text-xs font-semibold text-white drop-shadow">Luca material</span>
      </div>
    </div>
  );
};

export default OpticalMaterialPreview;
