import React from "react";
import PropTypes from "prop-types";

interface HologramFace2DProps {
  step: string;
}

const HologramFace2D: React.FC<HologramFace2DProps> = ({
  step,
}) => {
  // logoSrc is now reactive based on dark/light mode via CSS filter or just choosing one clear asset
  // For Sovereign OS, we use a single high-fidelity asset and apply reactive filters
  const logoSrc = "/icon.png";

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Large 2D Icon Face */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-40"
        style={{
          filter: `drop-shadow(0 0 40px var(--app-primary)) drop-shadow(0 0 80px var(--app-primary))`,
        }}
      >
        <div className="relative animate-pulse" style={{ width: "clamp(25rem, 90vmin, 50rem)", height: "clamp(25rem, 90vmin, 50rem)" }}>
          {/* Luca Icon */}
          <img
            src={logoSrc}
            alt="Luca AI"
            className="w-full h-full object-contain transition-all duration-1000"
            style={{
              filter: `brightness(1.2) contrast(1.3) drop-shadow(0 0 20px var(--app-primary))`,
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
              background: `radial-gradient(circle, var(--app-primary) 0%, transparent 70%)`,
              opacity: 0.4,
            }}
          />

          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 h-[1.5px]"
                style={{
                  top: `${i * 5}%`,
                  background: "var(--app-primary)",
                  opacity: 0.15,
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
              className="absolute rounded-full border-2 opacity-20 animate-ping"
              style={{
                width: "min(300px, 50vmin)",
                height: "min(300px, 50vmin)",
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
        className="absolute inset-0 opacity-10 animate-pulse pointer-events-none"
        style={{
          background: `radial-gradient(circle, var(--app-primary) 0%, transparent 50%)`,
          animationDuration: "4s",
        }}
      />

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

HologramFace2D.propTypes = {
  step: PropTypes.string.isRequired,
};

export default HologramFace2D;
