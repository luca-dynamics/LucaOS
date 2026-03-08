import React, { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// --- 1. ONE EURO FILTER (Adaptive Smoothing) ---
class LowPassFilter {
  y: number;
  s: number;

  constructor(alpha: number, initval: number = 0) {
    this.y = initval;
    this.s = alpha;
  }

  filter(value: number, alpha: number) {
    this.y = alpha * value + (1 - alpha) * this.y;
    return this.y;
  }

  filterWithAlpha(value: number, alpha: number) {
    this.y = alpha * value + (1 - alpha) * this.y;
    return this.y;
  }

  hasLastRawValue() {
    return true;
  }
}

class OneEuroFilter {
  minCutoff: number;
  beta: number;
  dcutoff: number;
  x: LowPassFilter;
  dx: LowPassFilter;
  startTime: number;

  constructor(
    minCutoff: number = 1.0,
    beta: number = 0.0,
    dcutoff: number = 1.0,
  ) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.x = new LowPassFilter(this.alpha(minCutoff));
    this.dx = new LowPassFilter(this.alpha(dcutoff));
    this.startTime = Date.now();
  }

  alpha(cutoff: number) {
    const te = 1.0 / 60.0;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestamp: number = Date.now()) {
    const te = (timestamp - this.startTime) / 1000.0;
    this.startTime = timestamp;

    const dx = (value - this.x.y) / te;
    const edx = this.dx.filterWithAlpha(dx, this.alpha(this.dcutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filterWithAlpha(value, this.alpha(cutoff));
  }
}

// --- 2. GESTURE STATE MACHINE (LUCA ENGINE) ---
type GestureState = "IDLE" | "HOVER" | "ENGAGE" | "MANIPULATE";

class LucaGestureEngine {
  state: GestureState = "IDLE";
  pinchThreshold: number = 0.05;
  releaseThreshold: number = 0.06;

  update(distance: number): GestureState {
    switch (this.state) {
      case "IDLE":
      case "HOVER":
        if (distance < this.pinchThreshold) this.state = "ENGAGE";
        else this.state = "HOVER";
        break;
      case "ENGAGE":
        if (distance > this.releaseThreshold) this.state = "HOVER";
        else this.state = "MANIPULATE";
        break;
      case "MANIPULATE":
        if (distance > this.releaseThreshold) this.state = "HOVER";
        break;
    }
    return this.state;
  }
}

// --- 3. COMPONENT ---
interface VisionHUDProps {
  themeColor?: string;
  onStreamReady?: (stream: MediaStream) => void;
  isActive?: boolean;
  performanceMode?: "high" | "balanced" | "eco";
}

export default function VisionHUD({
  themeColor = "#a855f7",
  onStreamReady,
  isActive = false,
  performanceMode = "balanced",
}: VisionHUDProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gestureState, setGestureState] = useState<GestureState>("IDLE");
  const [alwaysOnVisionRunning, setAlwaysOnVisionRunning] = useState(false);

  // Filters & Engine
  const filterX = useRef(new OneEuroFilter(0.5, 0.05));
  const filterY = useRef(new OneEuroFilter(0.5, 0.05));
  const engine = useRef(new LucaGestureEngine());
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  // Virtual Objects
  const virtualObjects = useRef(
    Array.from({ length: 3 }).map(() => ({
      x: 0.2 + Math.random() * 0.6,
      y: 0.2 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001,
      label: `SEC-NODE-${Math.floor(Math.random() * 900) + 100}`,
    })),
  );

  // Helpers
  const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split("");
      if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      c = "0x" + c.join("");
      return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
    }
    return `rgba(168, 85, 247, ${alpha})`;
  };

  const drawEcoHUD = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    colorHex: string,
  ) => {
    const time = Date.now() / 1000;
    ctx.save();
    ctx.translate(width - 40, height - 40);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    gradient.addColorStop(0, hexToRgba(colorHex, 0.2));
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(time * 2);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 1.5);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (Math.sin(time * 5) > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = colorHex;
      ctx.fill();
    }
    ctx.restore();
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = hexToRgba(colorHex, 0.5);
    ctx.fillText("MULTIMODAL_STREAM: ONLINE (ECO_MODE)", 20, 30);
  };

  const drawLucaHUD = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: GestureState,
    landmarks: any[],
    width: number,
    height: number,
    colorHex: string,
  ) => {
    const canvasX = (x / window.screen.width) * width;
    const canvasY = (y / window.screen.height) * height;
    const time = Date.now() / 1000;
    const baseColor = colorHex;
    const dimColor = hexToRgba(baseColor, 0.3);
    const faintColor = hexToRgba(baseColor, 0.1);

    ctx.lineWidth = 1;
    virtualObjects.current.forEach((obj) => {
      obj.x += obj.vx;
      obj.y += obj.vy;
      if (obj.x < 0.1 || obj.x > 0.9) obj.vx *= -1;
      if (obj.y < 0.1 || obj.y > 0.9) obj.vy *= -1;
      const ox = obj.x * width;
      const oy = obj.y * height;
      ctx.strokeStyle = dimColor;
      ctx.strokeRect(ox - 30, oy - 30, 60, 60);
      ctx.strokeStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(ox - 30, oy - 20);
      ctx.lineTo(ox - 30, oy - 30);
      ctx.lineTo(ox - 20, oy - 30);
      ctx.moveTo(ox + 30, oy - 20);
      ctx.lineTo(ox + 30, oy - 30);
      ctx.lineTo(ox + 20, oy - 30);
      ctx.moveTo(ox - 30, oy + 20);
      ctx.lineTo(ox - 30, oy + 30);
      ctx.lineTo(ox - 20, oy + 30);
      ctx.moveTo(ox + 30, oy + 20);
      ctx.lineTo(ox + 30, oy + 30);
      ctx.lineTo(ox + 20, oy + 30);
      ctx.stroke();
      ctx.font = "10px monospace";
      ctx.fillStyle = baseColor;
      ctx.fillText(obj.label, ox - 30, oy - 35);
      const dx = canvasX - ox;
      const dy = canvasY - oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 300) {
        ctx.beginPath();
        ctx.moveTo(canvasX, canvasY);
        ctx.lineTo(ox, oy);
        ctx.strokeStyle = hexToRgba(baseColor, 1 - dist / 300);
        ctx.stroke();
      }
    });

    trailRef.current.push({ x: canvasX, y: canvasY });
    if (trailRef.current.length > 10) trailRef.current.shift();
    ctx.beginPath();
    ctx.strokeStyle =
      state === "MANIPULATE" ? "rgba(34, 197, 94, 0.5)" : dimColor;
    ctx.lineWidth = 2;
    trailRef.current.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    const radius = state === "MANIPULATE" ? 15 : 25;
    const reticleColor = state === "MANIPULATE" ? "#22c55e" : baseColor;
    ctx.save();
    ctx.translate(canvasX, canvasY);
    ctx.rotate(time);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
    ctx.strokeStyle = reticleColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(-time * 2);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, 0, Math.PI);
    ctx.strokeStyle =
      state === "MANIPULATE"
        ? "rgba(34, 197, 94, 0.5)"
        : hexToRgba(baseColor, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = reticleColor;
    ctx.fill();
    if (state !== "MANIPULATE") {
      ctx.fillStyle = faintColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 100, 0, Math.PI / 4);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = faintColor;
    ctx.lineWidth = 1;
    for (const point of landmarks) {
      const px = (1 - point.x) * width;
      const py = point.y * height;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(baseColor, 0.2);
      ctx.fill();
    }
  };

  // Lifecycle
  useEffect(() => {
    setAlwaysOnVisionRunning(isActive);
  }, [isActive]);

  useEffect(() => {
    if (!alwaysOnVisionRunning) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    let landmarker: HandLandmarker | null = null;
    let animationFrameId: any;

    const setupVision = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
        );
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        startCamera();
      } catch (e) {
        console.error("[VisionHUD] Setup failed", e);
      }
    };

    const startCamera = async () => {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => predictWebcam();
            if (onStreamReady) onStreamReady(stream);
          }
        } catch (e) {
          console.error("[VisionHUD] Camera failed", e);
        }
      }
    };

    const predictWebcam = async () => {
      if (
        !landmarker ||
        !videoRef.current ||
        !canvasRef.current ||
        !alwaysOnVisionRunning
      )
        return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (video.videoWidth > 0) {
        if (canvas.width !== window.innerWidth) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        const isEco = performanceMode === "eco";
        if (!isEco) {
          const results = landmarker.detectForVideo(video, performance.now());
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          if (results.landmarks && results.landmarks[0]) {
            const landmarks = results.landmarks[0];
            const rawX = (1 - landmarks[8].x) * window.screen.width;
            const rawY = landmarks[8].y * window.screen.height;
            const smoothX = filterX.current.filter(rawX);
            const smoothY = filterY.current.filter(rawY);
            const distance = Math.sqrt(
              Math.pow(landmarks[4].x - landmarks[8].x, 2) +
                Math.pow(landmarks[4].y - landmarks[8].y, 2),
            );
            const newState = engine.current.update(distance);
            setGestureState(newState);
            if (window.luca?.moveMouse)
              window.luca.moveMouse(Math.round(smoothX), Math.round(smoothY));
            if (newState === "ENGAGE") {
              if (window.luca?.clickMouse) window.luca.clickMouse("down");
            } else if (
              newState === "HOVER" &&
              engine.current.state === "MANIPULATE"
            ) {
              if (window.luca?.clickMouse) window.luca.clickMouse("up");
            }
            drawLucaHUD(
              ctx!,
              smoothX,
              smoothY,
              newState,
              landmarks,
              canvas.width,
              canvas.height,
              themeColor,
            );
          } else {
            setGestureState("IDLE");
          }
        } else {
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          drawEcoHUD(ctx!, canvas.width, canvas.height, themeColor);
        }
      }

      if (alwaysOnVisionRunning) {
        const delay =
          performanceMode === "eco"
            ? 200
            : performanceMode === "balanced"
              ? 33
              : 0;
        if (delay > 0)
          animationFrameId = setTimeout(
            () => requestAnimationFrame(predictWebcam),
            delay,
          );
        else animationFrameId = requestAnimationFrame(predictWebcam);
      }
    };

    setupVision();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        clearTimeout(animationFrameId);
      }
    };
  }, [alwaysOnVisionRunning, performanceMode, themeColor]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <video ref={videoRef} autoPlay playsInline style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
