import React, { useEffect, useRef } from "react";
import {
  drawLucaCanvasOrb,
  type LucaCanvasOrbVisualState,
} from "./lucaCanvasOrbRenderer";

export type LucaCanvasPresenceOrbState = LucaCanvasOrbVisualState;

interface LucaCanvasPresenceOrbProps {
  state?: LucaCanvasPresenceOrbState;
  amplitude?: number;
  size?: number;
  themeColor?: string;
  secondaryColor?: string;
  darkColor?: string;
  lowPower?: boolean;
  visualCoreActive?: boolean;
  className?: string;
}

export function LucaCanvasPresenceOrb({
  state = "idle",
  amplitude = 0,
  size = 24,
  themeColor = "#67e8f9",
  secondaryColor = "#ffffff",
  darkColor = "#083344",
  lowPower = false,
  visualCoreActive = false,
  className = "",
}: LucaCanvasPresenceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef({
    state,
    amplitude,
    themeColor,
    secondaryColor,
    darkColor,
    lowPower,
    visualCoreActive,
  });

  useEffect(() => {
    frameRef.current = {
      state,
      amplitude,
      themeColor,
      secondaryColor,
      darkColor,
      lowPower,
      visualCoreActive,
    };
  }, [
    amplitude,
    darkColor,
    lowPower,
    secondaryColor,
    state,
    themeColor,
    visualCoreActive,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let animationFrame = 0;
    const draw = (timestamp: number) => {
      drawLucaCanvasOrb(context, canvas.width, canvas.height, {
        ...frameRef.current,
        time: timestamp * 0.001,
      });
      animationFrame = window.requestAnimationFrame(draw);
    };
    animationFrame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size * 2}
      height={size * 2}
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Luca ${state} status`}
      data-visual-source="dictation-voice-canvas-orb"
    />
  );
}
