import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PresenceMarkState } from "../../presence/presenceMark";
import PresenceMark from "./PresenceMark";
import { LucaLiquidGlassLayer } from "../material/LucaLiquidGlass";
import {
  createLiquidPresenceRenderer,
  type LiquidPresenceRenderer,
} from "./liquidPresenceRenderer";
import LucaChromaticMetal from "../material/LucaChromaticMetal";
import { settingsService } from "../../services/settingsService";
import { normalizeLucaOpticalMaterialSettings } from "../../styles/lucaOpticalMaterialSettings";

/**
 * Luca's full presence body: the liquid orb, with the calm 2D mark as the
 * graceful reduction when WebGL2 is unavailable or the user prefers
 * reduced motion. Same props, same states — only the material changes.
 */

interface LiquidPresenceMarkProps {
  state: PresenceMarkState;
  amplitude?: number;
  identityColor?: string;
  size?: number;
  onClick?: () => void;
  title?: string;
}

const LiquidPresenceMark: React.FC<LiquidPresenceMarkProps> = ({
  state,
  amplitude = 0,
  identityColor,
  size = 112,
  onClick,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LiquidPresenceRenderer | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [metalTuning, setMetalTuning] = useState(() =>
    normalizeLucaOpticalMaterialSettings(settingsService.getSettings().general.opticalMaterial).metal,
  );

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const useFallback = reducedMotion || webglFailed;

  useEffect(() => {
    if (useFallback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createLiquidPresenceRenderer(canvas, size);
    if (!renderer) {
      setWebglFailed(true);
      return;
    }
    rendererRef.current = renderer;
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [size, useFallback]);

  useEffect(() => {
    rendererRef.current?.setInput({ state, amplitude, identityColor });
  }, [state, amplitude, identityColor]);

  useEffect(() => {
    const onSettingsChanged = () => {
      setMetalTuning(
        normalizeLucaOpticalMaterialSettings(settingsService.getSettings().general.opticalMaterial).metal,
      );
    };
    settingsService.on("settings-changed", onSettingsChanged);
    return () => { settingsService.off("settings-changed", onSettingsChanged); };
  }, []);

  if (useFallback) {
    return (
      <PresenceMark
        state={state}
        amplitude={amplitude}
        identityColor={identityColor}
        size={size}
        onClick={onClick}
        title={title}
      />
    );
  }

  return (
    <div
      role={onClick ? "button" : "img"}
      aria-label={title ?? `Luca — ${state}`}
      onClick={onClick}
      title={title}
      className="relative flex items-center justify-center cursor-pointer group"
      style={
        {
          width: size,
          height: size,
          WebkitAppRegion: "no-drag",
        } as React.CSSProperties
      }
    >
      <LucaChromaticMetal shape="orb" tuning={metalTuning} className="opacity-75 mix-blend-screen" />
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="absolute inset-0 pointer-events-none"
      />
      <LucaLiquidGlassLayer shape="circle" depth="hero" />
      <div
        className="absolute rounded-full border border-white/0 group-hover:border-white/15 pointer-events-none"
        style={{
          inset: size * 0.14,
          transitionProperty: "border-color",
          transitionDuration: "var(--luca-duration-fast, 160ms)",
          transitionTimingFunction: "var(--luca-ease, ease-out)",
        }}
      />
    </div>
  );
};

export default LiquidPresenceMark;
