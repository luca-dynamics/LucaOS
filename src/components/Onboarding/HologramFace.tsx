import React, { useMemo } from "react";
import HologramScene from "../Hologram/HologramScene";
import HologramFace2D from "./HologramFace2D";
import { detectDeviceCapabilities } from "../../utils/deviceDetection";

interface HologramFaceProps {
  step: string;
}

const HologramFace: React.FC<HologramFaceProps> = ({ 
  step 
}) => {
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);

  if (capabilities.isLowPerformance) {
    return (
      <HologramFace2D
        step={step}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Large 3D Holographic Face */}
      <div
        className="absolute inset-0 flex items-center justify-center shadow-2xl shadow-black/80 transition-all duration-700"
        style={{
          opacity:
            "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.84) / 0.16), 1)) * 0.42)",
          filter: `blur(calc(var(--app-bg-blur, 40px) * 0.12)) drop-shadow(0 0 60px var(--app-primary)) drop-shadow(0 0 100px var(--app-primary))`,
        }}
      >
        <div 
          className="w-full h-full"
          style={{
            maxWidth: "clamp(30rem, 110vmin, 80rem)",
            maxHeight: "clamp(30rem, 110vmin, 80rem)",
          }}
        >
          {/* HologramScene internally pulls from var(--app-primary) or we pass it explicitly */}
          <HologramScene
            color="var(--app-primary)"
            audioLevel={step === "CALIBRATION" ? 150 : 0}
          />
        </div>
      </div>

      {/* Wave Effect Rings - Only during calibration */}
      {step === "CALIBRATION" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 opacity-20 animate-ping"
              style={{
                width: "min(400px, 60vmin)",
                height: "min(400px, 60vmin)",
                borderColor: "var(--app-primary)",
                animationDelay: `${i * 0.6}s`,
                animationDuration: "3s",
              }}
            />
          ))}
        </div>
      )}

      {/* Subtle Glow Pulse Effect */}
      <div
        className="absolute inset-0 animate-pulse pointer-events-none transition-opacity duration-700"
        style={{
          opacity:
            "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.84) / 0.16), 1)) * 0.1)",
          background: `radial-gradient(circle, var(--app-primary) 0%, transparent 50%)`,
          animationDuration: "4s",
        }}
      />
    </div>
  );
};

export default HologramFace;
