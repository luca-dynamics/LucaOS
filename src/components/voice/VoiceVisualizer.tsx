import React, { useEffect, useRef, useState } from "react";
import { eventBus } from "../../services/eventBus";
import { PersonaType } from "../../services/lucaService";
import { THEME_PALETTE, setHexAlpha } from "../../config/themeColors";
import { resolveVoiceVisualizerGeometry } from "./voiceVisualizerGeometry";

// Removed local CANVAS_THEME_COLORS map to use central THEME_PALETTE from themeColors.ts

interface VoiceVisualizerProps {
  amplitude: number;
  isVadActive: boolean;
  transcriptSource: "user" | "model";
  persona: PersonaType;
  lowPower?: boolean;
  skinColors?: {
    primary: string;
    secondary: string;
    background: string;
  };
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  amplitude,
  isVadActive,
  transcriptSource,
  persona,
  lowPower = false,
  skinColors,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep one safe logical coordinate space for the lifetime of the HUD. CSS
  // then scales the whole voice composition with the native window, matching
  // the fluid placement of the original VoiceHUD without its edge clipping.
  const [referenceSize, setReferenceSize] = useState({
    width: 1024,
    height: 768,
  });
  const internalAmplitude = useRef(0);
  const amplitudeRef = useRef(amplitude);
  const isVadActiveRef = useRef(isVadActive);
  const transcriptSourceRef = useRef(transcriptSource);
  const personaRef = useRef(persona);
  const skinColorsRef = useRef(skinColors);

  // Direct Event Hub Listening (60FPS smoothness)
  useEffect(() => {
    const handleAmplitude = (data: any) => {
      // Standardized 0-255 to internal 0-1.0 normalization
      internalAmplitude.current = data.amplitude / 255;
    };
    eventBus.on("audio-amplitude", handleAmplitude);
    return () => {
      eventBus.off("audio-amplitude", handleAmplitude);
    };
  }, []);

  // Sync refs with props for the animation loop (Fallback)
  useEffect(() => {
    // If props are passed as 0-1 (legacy), but standardized as 0-255
    // We trust the direct internalAmplitude from eventBus more for responsiveness
    amplitudeRef.current = amplitude > 1 ? amplitude / 255 : amplitude;
    isVadActiveRef.current = isVadActive;
    transcriptSourceRef.current = transcriptSource;
    personaRef.current = persona;
    skinColorsRef.current = skinColors;
  }, [amplitude, isVadActive, transcriptSource, persona, skinColors]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const rect = container.getBoundingClientRect();
    setReferenceSize({
      width: Math.max(1, Math.round(rect.width || window.innerWidth)),
      height: Math.max(1, Math.round(rect.height || window.innerHeight)),
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const dpr =
      typeof window === "undefined"
        ? 1
        : Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.max(1, referenceSize.width);
    const displayHeight = Math.max(1, referenceSize.height);
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      if (!canvas || !ctx) return;

      // Prioritize internal direct-event amplitude for smoothness
      const currentAmplitude = Math.max(
        amplitudeRef.current,
        internalAmplitude.current,
      );
      const currentIsVadActive = isVadActiveRef.current;
      const currentSource = transcriptSourceRef.current;
      const currentPersona = personaRef.current;
      const personaColors =
        THEME_PALETTE[currentPersona as keyof typeof THEME_PALETTE] ||
        THEME_PALETTE.RUTHLESS;
      const themeColors = skinColorsRef.current ?? {
        primary: personaColors.primary,
        secondary: personaColors.secondary,
        background: personaColors.dark,
      };

      // Clear canvas
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const shortSide = Math.max(1, Math.min(displayWidth, displayHeight));
      const {
        centerX,
        centerY,
        baseRadius,
        baseOrbRadius,
        spectrumPulse,
      } = resolveVoiceVisualizerGeometry(displayWidth, displayHeight);
      const time = Date.now() * 0.001;
      const tick = time;

      // --- 1. LIQUID PLASMA ORB (The Core) ---
      const activeScale = currentIsVadActive ? 1.2 : 1.0;

      ctx.save();
      ctx.translate(centerX, centerY);

      ctx.beginPath();
      // Draw fluid shape
      const points = lowPower ? 40 : 120;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;

        // Wave superposition for "liquid" effect
        const w1 = Math.sin(angle * 3 + tick) * shortSide * 0.013;
        const w2 = lowPower
          ? 0
          : Math.cos(angle * 6 - tick * 1.5) * shortSide * 0.01;
        const w3 =
          Math.sin(angle * 12 + tick * 5) *
          (currentAmplitude * shortSide * 0.075);
        const pulse = currentAmplitude * shortSide * 0.04;

        const r = (baseOrbRadius + w1 + w2 + w3 + pulse) * activeScale;

        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Fill Gradient Logic
      const gradient = ctx.createRadialGradient(
        0,
        0,
        baseOrbRadius * 0.2,
        0,
        0,
        baseOrbRadius * 1.5,
      );

      if (currentIsVadActive) {
        // LISTENING: Bright Core
        gradient.addColorStop(0, "#ffffff"); // White hot core
        gradient.addColorStop(0.4, themeColors.secondary);
        gradient.addColorStop(1, setHexAlpha(themeColors.primary, 0)); // Transparent edge
      } else if (currentSource === "model" && currentAmplitude > 0.05) {
        // SPEAKING: Deep Pulse
        gradient.addColorStop(0, themeColors.secondary);
        gradient.addColorStop(0.5, themeColors.primary);
        gradient.addColorStop(1, setHexAlpha(themeColors.primary, 0));
      } else {
        // STANDBY: Subtle Glow
        gradient.addColorStop(0, themeColors.primary);
        gradient.addColorStop(0.6, setHexAlpha(themeColors.background, 0.5));
        gradient.addColorStop(1, "rgba(0,0,0,0)");
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Outer Glow Stroke (Heavy on Canvas, disabled in lowPower)
      if (!lowPower) {
        ctx.shadowBlur = 20 + currentAmplitude * 30;
        ctx.shadowColor = currentIsVadActive
          ? themeColors.secondary
          : themeColors.primary;
      }
      ctx.strokeStyle = currentIsVadActive
        ? "#ffffff"
        : setHexAlpha(themeColors.primary, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
      ctx.restore();

      // Ring 1: Dashed Outer
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tick * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = setHexAlpha(themeColors.primary, 0.2);
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 20]); // Dashed
      ctx.stroke();
      ctx.restore();

      // Ring 2: Segmented Containment
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-tick * 0.5);
      const segments = 3;
      for (let i = 0; i < segments; i++) {
        ctx.rotate((Math.PI * 2) / segments);
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 2.2, 0, Math.PI * 0.4); // Arc segment
        ctx.strokeStyle = currentIsVadActive
          ? themeColors.secondary
          : themeColors.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Ring 3: Audio Spectrum Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        baseOrbRadius * 2.5 + currentAmplitude * spectrumPulse,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = setHexAlpha(themeColors.primary, 0.2);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [referenceSize.height, referenceSize.width, lowPower]); // Loop uses refs for live voice state.

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center z-20 pointer-events-none overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[size:60px_60px]"
        style={{
          backgroundImage: `linear-gradient(${setHexAlpha(skinColors?.primary ?? (THEME_PALETTE[persona as keyof typeof THEME_PALETTE] || THEME_PALETTE.RUTHLESS).primary, 0.1)} 1px, transparent 1px), linear-gradient(90deg, ${setHexAlpha(skinColors?.primary ?? (THEME_PALETTE[persona as keyof typeof THEME_PALETTE] || THEME_PALETTE.RUTHLESS).primary, 0.1)} 1px, transparent 1px)`,
        }}
      ></div>
    </div>
  );
};

export default VoiceVisualizer;
