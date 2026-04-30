import React, { useEffect, useRef } from "react";

interface SubsystemPulseProps {
  color: string;
  amplitude?: number;
  opacity?: number;
  blur?: number;
}

/**
 * SOVEREIGN ETHEREAL PULSE
 * Industrial-grade performance, Apple-premium aesthetics.
 * Uses Canvas for a high-fidelity fluid mesh that reacts to Luca's life states.
 */
export const SubsystemPulse: React.FC<SubsystemPulseProps> = ({ 
  color, 
  amplitude = 0,
  opacity = 0.6,
  blur = 80
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const time = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      time.current += 0.005 + (amplitude * 0.02);

      ctx.clearRect(0, 0, width, height);

      // Create Multiple Overlapping Blobs for Depth
      const drawBlob = (x: number, y: number, r: number, alpha: number) => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${color}00`);

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };

      // Industrial Grade: Precise math for "Floating" sensation
      const centerX = width / 2;
      const centerY = height / 2;
      const moveRange = 100 * (1 + amplitude);

      // Blob 1: Core
      drawBlob(
        centerX + Math.sin(time.current * 0.7) * moveRange,
        centerY + Math.cos(time.current * 0.5) * moveRange,
        400 * (1 + amplitude * 0.5),
        0.15
      );

      // Blob 2: Drifting Accents
      drawBlob(
        centerX + Math.cos(time.current * 0.4) * (moveRange * 1.5),
        centerY + Math.sin(time.current * 0.6) * (moveRange * 1.5),
        300 * (1 + amplitude * 0.3),
        0.1
      );

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color, amplitude]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ filter: `blur(${blur}px) saturate(1.5)`, opacity: opacity }}
    />
  );
};
