import React, { useEffect, useRef } from "react";

interface SignalVisualizerProps {
  themeColor: string;
  mode?: "BINARY" | "SPECTRAL" | "MATRIX";
  opacity?: number;
}

const SignalVisualizer: React.FC<SignalVisualizerProps> = ({
  themeColor,
  mode = "SPECTRAL",
  opacity = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // --- SPECTRAL MODE ---
    const particles: {
      x: number;
      y: number;
      speed: number;
      size: number;
      alpha: number;
    }[] = [];
    if (mode === "SPECTRAL") {
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: 0.5 + Math.random() * 2,
          size: 1 + Math.random() * 2,
          alpha: 0.1 + Math.random() * 0.5,
        });
      }
    }

    // --- MATRIX/BINARY MODE ---
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = new Array(columns)
      .fill(1)
      .map(() => (Math.random() * height) / fontSize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (mode === "SPECTRAL") {
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1;

        // Draw flowing waves
        const time = Date.now() * 0.001;
        ctx.beginPath();
        for (let x = 0; x < width; x += 10) {
          const y =
            height / 2 +
            Math.sin(x * 0.005 + time) * 50 +
            Math.cos(x * 0.01 - time * 0.5) * 30;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = opacity * 0.5;
        ctx.stroke();

        // Draw particles
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = themeColor;
          ctx.globalAlpha = p.alpha * opacity;
          ctx.fill();

          p.y -= p.speed;
          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }
        });
      } else {
        // MATRIX / BINARY
        ctx.fillStyle = themeColor;
        ctx.font = `${fontSize}px monospace`;
        ctx.globalAlpha = opacity;

        for (let i = 0; i < drops.length; i++) {
          const text =
            mode === "BINARY"
              ? Math.random() > 0.5
                ? "1"
                : "0"
              : String.fromCharCode(0x30a0 + Math.random() * 96);
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);

          if (drops[i] * fontSize > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i] += 0.5 + Math.random();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [themeColor, mode, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: isFinite(opacity) ? opacity : 0.3 }}
    />
  );
};

export default SignalVisualizer;
