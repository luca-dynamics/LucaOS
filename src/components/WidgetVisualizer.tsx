import React, { useEffect, useRef } from "react";
import { THEME_PALETTE, setHexAlpha } from "../config/themeColors";

// Shared Theme Constants (Consider moving to a shared constants file later)
// Removed local THEME_COLORS map to use central THEME_PALETTE from themeColors.ts

interface WidgetVisualizerProps {
  amplitude: number;
  isVadActive: boolean;
  isSpeaking: boolean;
  persona?: string;
  themeHex?: string;
  isVisualCoreActive?: boolean;
  onClick?: () => void;
}

const WidgetVisualizer: React.FC<WidgetVisualizerProps> = ({
  amplitude,
  isVadActive,
  isSpeaking,
  persona,
  themeHex,
  isVisualCoreActive,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Refs for tracking animation state without re-rendering loop
  const stateRef = useRef({
    amplitude,
    isVadActive,
    isSpeaking,
    persona,
    themeHex,
    isVisualCoreActive,
  });

  // Update refs when props change (this avoids restarting the animation loop)
  useEffect(() => {
    stateRef.current = {
      amplitude,
      isVadActive,
      isSpeaking,
      persona,
      themeHex,
      isVisualCoreActive,
    };
  }, [amplitude, isVadActive, isSpeaking, persona, themeHex, isVisualCoreActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      // Access fresh state from Ref
      const { amplitude, isVadActive, isSpeaking, persona, themeHex, isVisualCoreActive } =
        stateRef.current;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() * 0.001;
      const tick = time;

      // Base Config
      const baseOrbRadius = 25;
      const activeScale = isVadActive ? 1.2 : 1.0;

      // THEMED COLORS
      const currentTheme =
        THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
        THEME_PALETTE.RUTHLESS;

      // Use themeHex if provided, otherwise fallback to persona primary (with safety check)
      const primaryColor =
        themeHex || currentTheme?.primary || THEME_PALETTE.RUTHLESS.primary;
      const secondaryColor =
        currentTheme?.secondary || THEME_PALETTE.RUTHLESS.secondary;
      const darkColor = currentTheme?.dark || THEME_PALETTE.RUTHLESS.dark;

      // 1. LIQUID PLASMA ORB
      ctx.save();
      ctx.translate(centerX, centerY);

      ctx.beginPath();
      // Draw fluid shape
      const points = 100;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        // Wave math
        const w1 = Math.sin(angle * 3 + tick) * 5;
        const w2 = Math.cos(angle * 6 - tick * 1.5) * 4;
        const w3 = Math.sin(angle * 12 + tick * 5) * (amplitude * 30);
        const pulse = amplitude * 15;
        const r = (baseOrbRadius + w1 + w2 + w3 + pulse) * activeScale;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Gradients
      const gradient = ctx.createRadialGradient(
        0,
        0,
        baseOrbRadius * 0.2,
        0,
        0,
        baseOrbRadius * 1.5,
      );

      if (isVadActive) {
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.4, secondaryColor);
        gradient.addColorStop(1, setHexAlpha(primaryColor, 0));
      } else if (isSpeaking && amplitude > 0.05) {
        gradient.addColorStop(0, secondaryColor);
        gradient.addColorStop(0.5, primaryColor);
        gradient.addColorStop(1, setHexAlpha(primaryColor, 0));
      } else {
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.6, setHexAlpha(darkColor, 0.5));
        gradient.addColorStop(1, "rgba(0,0,0,0)");
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Outer Glow
      ctx.shadowBlur = 10 + amplitude * 20;
      ctx.shadowColor = isVadActive ? secondaryColor : primaryColor;
      ctx.strokeStyle = isVadActive
        ? "#ffffff"
        : setHexAlpha(primaryColor, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // 2. ORBITAL RINGS
      // Ring 1: Dashed Outer
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tick * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, baseOrbRadius * 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = setHexAlpha(primaryColor, 0.2);
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 15]);
      ctx.stroke();
      ctx.restore();

      // Ring 2: Audio Spectrum Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.arc(0, 0, baseOrbRadius * 2.2 + amplitude * 10, 0, Math.PI * 2);
      ctx.strokeStyle = setHexAlpha(primaryColor, 0.2);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Ring 3: NEW! SMART SCREEN HUD ACTIVE RING (Industrial Grade)
      if (isVisualCoreActive) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-tick * 0.4);
        ctx.beginPath();
        // Slightly larger than others, glowing
        ctx.arc(0, 0, baseOrbRadius * 2.5, 0, Math.PI * 1.5); 
        ctx.strokeStyle = isVadActive ? "#ffffff" : primaryColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = primaryColor;
        ctx.stroke();
        
        // Add tiny markers on the ring
        for(let a = 0; a < Math.PI * 1.5; a += Math.PI/4) {
            const x = Math.cos(a) * baseOrbRadius * 2.5;
            const y = Math.sin(a) * baseOrbRadius * 2.5;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI*2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        }
        ctx.restore();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []); // Run once on mount! loop depends on ref

  return (
    <div
      className="relative w-32 h-32 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform group"
      style={{ WebkitAppRegion: "no-drag" } as any}
      onClick={onClick}
      title="Toggle Voice Input"
    >
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Hover Hint Ring */}
      <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 transition-all pointer-events-none"></div>
    </div>
  );
};

export default WidgetVisualizer;
