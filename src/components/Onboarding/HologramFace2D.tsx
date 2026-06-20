import React from "react";
import PropTypes from "prop-types";

interface HologramFace2DProps {
  step: string;
}

const HologramFace2D: React.FC<HologramFace2DProps> = ({ step }) => {
  // Quiet Machine: the Luca face is shown calmly — soft glow + gentle float.
  // No scanlines, no brightness/contrast cyber boost (retired per the doctrine).
  const logoSrc = "/icon.png";

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-700"
        style={{
          opacity:
            "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.84) / 0.16), 1)) * 0.5)",
          filter: `blur(calc(var(--app-bg-blur, 40px) * 0.12)) drop-shadow(0 0 48px var(--app-primary))`,
        }}
      >
        <div
          className="relative"
          style={{
            width: "clamp(25rem, 90vmin, 50rem)",
            height: "clamp(25rem, 90vmin, 50rem)",
          }}
        >
          {/* Luca face — calm, true to the asset */}
          <img
            src={logoSrc}
            alt="Luca AI"
            className="w-full h-full object-contain transition-all duration-1000"
            style={{
              filter: "drop-shadow(0 0 28px var(--app-primary))",
              animation:
                step === "CALIBRATION"
                  ? "spin 14s linear infinite"
                  : "float 6.4s ease-in-out infinite",
            }}
          />

          {/* Soft accent halo */}
          <div
            className="absolute inset-0 mix-blend-overlay rounded-full"
            style={{
              background: `radial-gradient(circle, var(--app-primary) 0%, transparent 70%)`,
              opacity: 0.28,
            }}
          />
        </div>
      </div>

      {/* Wave rings — only during calibration */}
      {step === "CALIBRATION" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border opacity-20 animate-ping"
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

      {/* Subtle glow pulse */}
      <div
        className="absolute inset-0 animate-pulse pointer-events-none transition-opacity duration-700"
        style={{
          opacity:
            "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.84) / 0.16), 1)) * 0.1)",
          background: `radial-gradient(circle, var(--app-primary) 0%, transparent 50%)`,
          animationDuration: "4s",
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-16px) scale(1.03); }
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
