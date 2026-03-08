import React from "react";
import { setHexAlpha } from "../../config/themeColors";

interface HologramFace2DProps {
  step:
    | "BOOT"
    | "LEGAL"
    | "THEME"
    | "IDENTITY"
    | "FACE_SCAN"
    | "BRIDGE"
    | "HARDWARE_SCAN"
    | "OLLAMA_INSTALL"
    | "OLLAMA_WAKE"
    | "PROVISION_LOCAL"
    | "MODE_SELECT"
    | "CONVERSATION"
    | "CALIBRATION"
    | "COMPLETE";
  themeHex?: string;
  secondaryHex?: string;
}

/**
 * 2D Fallback for Hologram Face (for weak devices)
 * Uses static icon with CSS animations instead of 3D WebGL
 */
const HologramFace2D: React.FC<HologramFace2DProps> = ({
  step,
  themeHex,
  secondaryHex,
}) => {
  // Use passed colors or default
  const color = themeHex || "#E0E0E0";
  const secondary = secondaryHex || color;
  const glow = setHexAlpha(secondary, 0.5);

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Large 2D Icon Face */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-40"
        style={{
          filter: `drop-shadow(0 0 40px ${glow}) drop-shadow(0 0 80px ${glow})`,
        }}
      >
        <div className="relative w-[400px] h-[400px] animate-pulse">
          {/* Luca Icon */}
          <img
            src="/icon.png"
            alt="Luca AI"
            className="w-full h-full object-contain transition-all duration-1000"
            style={{
              filter: `brightness(1.2) contrast(1.3)`,
              animation:
                step === "CALIBRATION"
                  ? "spin 8s linear infinite"
                  : "float 6s ease-in-out infinite",
            }}
          />

          {/* Color overlay tint */}
          <div
            className="absolute inset-0 mix-blend-overlay rounded-full"
            style={{
              background: `radial-gradient(circle, ${setHexAlpha(color, 0.4)} 0%, transparent 70%)`,
            }}
          />

          {/* Scanline effect (lighter than 3D version) */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 h-[2px]"
                style={{
                  top: `${i * 5}%`,
                  background: color,
                  opacity: 0.1,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Wave Effect Rings - Only during calibration */}
      {step === "CALIBRATION" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-[300px] h-[300px] rounded-full border-2 opacity-20 animate-ping"
              style={{
                borderColor: color,
                animationDelay: `${i * 0.6}s`,
                animationDuration: "3s",
              }}
            />
          ))}
        </div>
      )}

      {/* Subtle Glow Pulse Effect */}
      <div
        className="absolute inset-0 opacity-10 animate-pulse pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${secondary} 0%, transparent 50%)`,
          animationDuration: "4s",
        }}
      />

      {/* CSS Keyframes for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HologramFace2D;
