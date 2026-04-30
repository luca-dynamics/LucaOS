import React, { useMemo } from "react";
import HologramScene from "../Hologram/HologramScene";
import HologramFace2D from "./HologramFace2D";
import { detectDeviceCapabilities } from "../../utils/deviceDetection";
import { THEME_PALETTE, setHexAlpha } from "../../config/themeColors";

interface HologramFaceProps {
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
  themeHex: string;
}

/**
 * Smart Hologram Face Component
 * - Uses 3D WebGL version on capable devices
 * - Falls back to 2D CSS version on weak devices
 */
const HologramFace: React.FC<HologramFaceProps> = ({ step, themeHex }) => {
  // Detect device capabilities once
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);

  // Use theme color
  const color = themeHex || THEME_PALETTE.ASSISTANT.primary;

  // Find persona match for secondary color
  const personaKey = Object.keys(THEME_PALETTE).find(
    (k) => THEME_PALETTE[k as keyof typeof THEME_PALETTE].primary === themeHex,
  ) as keyof typeof THEME_PALETTE;
  const secondaryColor = personaKey
    ? THEME_PALETTE[personaKey].secondary
    : color;

  const glow = setHexAlpha(secondaryColor, 0.3);

  // Use 2D fallback for low-performance devices
  if (capabilities.isLowPerformance) {
    return (
      <HologramFace2D
        step={step}
        themeHex={color}
        secondaryHex={secondaryColor}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Large 3D Holographic Face */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-30"
        style={{
          filter: `drop-shadow(0 0 60px ${glow}) drop-shadow(0 0 100px ${glow})`,
        }}
      >
        <div className="w-full h-full max-w-[800px] max-h-[800px]">
          <HologramScene
            color={color}
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
              className="absolute w-[400px] h-[400px] rounded-full border-2 opacity-20 animate-ping"
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
          background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 50%)`,
          animationDuration: "4s",
        }}
      />
    </div>
  );
};

export default HologramFace;
