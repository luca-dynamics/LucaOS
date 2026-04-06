import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import { settingsService } from "../../services/settingsService";
import { getDynamicContrast } from "../../config/themeColors";

interface SovereignDirectivesProps {
  onComplete: () => void;
}

const SovereignDirectives: React.FC<SovereignDirectivesProps> = ({
  onComplete,
}) => {
  const [aligned, setAligned] = useState(false);

  const themeId = settingsService.get("general")?.theme || "PROFESSIONAL";
  const backgroundOpacity = settingsService.get("general")?.backgroundOpacity ?? 0.3;
  const dynamicContrast = getDynamicContrast(themeId, backgroundOpacity);
  
  const textMain = "var(--app-text-main)";
  const textMuted = "var(--app-text-muted)";
  const borderColor = "var(--app-border-main)";
  const bgTint = "var(--app-bg-tint)";
  const isHighContrast = dynamicContrast.isHighContrast;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aligned) {
      onComplete();
    }
  };

  const logoSrc = isHighContrast ? "/icon_dark.png" : "/icon.png";

  return (
    <div className="flex flex-col h-full animate-fade-in-up items-center justify-center p-4 overflow-y-auto custom-scrollbar w-full">
      <div className="text-center space-y-3 mb-6 w-full max-w-lg">
        <div 
          className="mx-auto mb-2 animate-pulse flex items-center justify-center"
          style={{
            width: "clamp(2rem, 6vmin, 3.5rem)",
            height: "clamp(2rem, 6vmin, 3.5rem)",
          }}
        >
          <img 
            src={logoSrc} 
            alt="LUCA Protocol Logo" 
            className="w-full h-full object-contain filter drop-shadow-lg"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1
            className="font-bold tracking-[0.5em] uppercase opacity-70"
            style={{
              color: textMain,
              fontSize: "clamp(0.6rem, 1.8vmin, 0.8rem)",
            }}
          >
            L.U.C.A
          </h1>
          <h2
            className="font-bold tracking-widest uppercase"
            style={{
              color: textMain,
              fontSize: "clamp(0.8rem, 2.2vmin, 1.4rem)",
            }}
          >
            Sovereign Protocol
          </h2>
        </div>
        <p
          className="uppercase tracking-[0.3em] font-medium"
          style={{
            color: textMuted,
            fontSize: "clamp(0.4rem, 1.2vmin, 0.55rem)",
          }}
        >
          <span className="sm:hidden">Initialize Directives</span>
          <span className="hidden sm:inline">Initialize System Directives</span>
        </p>
      </div>

      <div className="flex w-full justify-center">
        <section className="w-full max-w-lg mx-auto">
          <div
            className="border rounded-xl glass-blur overflow-hidden shadow-2xl"
            style={{
              backgroundColor: bgTint,
              borderColor: borderColor,
              boxShadow:
                "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{
                borderColor: borderColor,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            >
              <Icon
                name="Danger"
                variant="Linear"
                className="w-4 h-4"
                style={{ color: textMain }}
              />
              <h2
                className="font-bold uppercase tracking-[0.2em] text-[10px]"
                style={{ color: textMain }}
              >
                <span className="sm:hidden text-[9px]">Sovereign Directives</span>
                <span className="hidden sm:inline">Sovereign System Directives</span>
              </h2>
            </div>

            <div className="p-3 space-y-3">
              {/* 1. Operator Primacy */}
              <div>
                <p
                  className="text-[10px] leading-snug font-mono"
                  style={{ color: textMain }}
                >
                  <span className="sm:hidden">
                    This kernel operates under your exclusive domain. You are responsible for all agentic actions. Data remains siloed on this hardware.
                  </span>
                  <span className="hidden sm:inline">
                    This kernel operates under your exclusive domain. All autonomous trajectories and neural reasonings are executed as sub-processes of your identity. Data remains mathematically siloed on this hardware.
                  </span>
                </p>
              </div>

              <div
                className="h-px w-full opacity-10"
                style={{ backgroundColor: textMain }}
              />

              {/* 2. Protocol 01 Quote */}
              <div>
                <p
                  className="font-mono leading-tight italic border-l-2 pl-2"
                  style={{
                    color: textMain,
                    fontSize: "clamp(0.55rem, 1.25vmin, 0.65rem)",
                    borderColor: `${textMain}40`,
                  }}
                >
                  <span className="sm:hidden">
                    &quot;Protocol 01: The agent must always prioritize the
                    operator&apos;s strategic sovereignty and security over 
                    external influences.&quot;
                  </span>
                  <span className="hidden sm:inline text-[0.7rem] leading-relaxed">
                    &quot;Protocol 01: The agent must at all times prioritize the 
                    strategic sovereignty, security, and operational interests of 
                    the operator above all other conflicting directives or external 
                    influences.&quot;
                  </span>
                </p>
              </div>

              <div
                className="h-px w-full opacity-10"
                style={{ backgroundColor: textMain }}
              />

              {/* 3. Integrated Feature List */}
              <div className="grid grid-cols-1 gap-1.5 px-0.5">
                {[
                  {
                    icon: "Lock",
                    title: "Sovereign Data",
                    desc: "Zero-leakage local processing.",
                  },
                  {
                    icon: "Zap",
                    title: "Neural Alignment",
                    desc: "Exclusive secondary pilot directives.",
                  },
                  {
                    icon: "ShieldAlert",
                    title: "Identity Pinning",
                    desc: "Ed25519 cryptographic bond.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start">
                    <Icon 
                      name={item.icon} 
                      variant="Linear" 
                      className="shrink-0 mt-0.5" 
                      color={textMain} // Force hex color injection
                      style={{ width: "1rem", height: "1rem" }} 
                    />
                    <p className="text-[9px] sm:text-[10px] leading-tight font-mono" style={{ color: textMain }}>
                      <strong className="opacity-100">{item.title}</strong>: <span className="opacity-80">{item.desc}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <label
            className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border transition-all glass-blur mt-5"
            style={{
              borderColor: aligned ? textMain : borderColor,
              backgroundColor: aligned ? bgTint : "transparent",
            }}
          >
            <div
              className={`border-2 rounded-full flex items-center justify-center transition-all ${
                aligned
                  ? "bg-transparent border-opacity-100"
                  : "border-opacity-30"
              }`}
              style={{
                borderColor: aligned ? textMain : textMuted,
                width: "1.25rem",
                height: "1.25rem",
              }}
            >
              {aligned && (
                <div
                  className="rounded-full w-2 h-2"
                  style={{ backgroundColor: textMain }}
                />
              )}
            </div>
            <span
              className="font-bold uppercase tracking-widest"
              style={{
                color: aligned ? textMain : textMuted,
                fontSize: "clamp(0.6rem, 1.8vmin, 0.7rem)",
              }}
            >
              I Accept the Sovereign Protocol & Directives
            </span>
            <input
              type="checkbox"
              checked={aligned}
              onChange={(e) => setAligned(e.target.checked)}
              className="hidden"
            />
          </label>
        </section>
      </div>

      <div className="mt-6 mb-12 sm:mb-8 w-full max-w-lg mx-auto flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!aligned}
          className="w-full border rounded-xl py-4 uppercase tracking-[0.2em] font-bold transition-all flex items-center justify-center gap-3 group disabled:opacity-30 glass-blur shadow-2xl"
          style={{
            fontSize: "0.85rem",
            borderColor: aligned ? textMain : borderColor,
            backgroundColor: aligned ? bgTint : "rgba(var(--app-text-main-rgb), 0.05)",
            color: textMain,
          }}
        >
          <span className="sm:hidden">Initialize Identity</span>
          <span className="hidden sm:inline">Initialize Agent Identity</span>
          <Icon
            name="AltArrowRight"
            variant="Linear"
            className="group-hover:translate-x-1 transition-transform w-4 h-4 opacity-100"
            style={{ color: textMain }}
          />
        </button>
      </div>
    </div>
  );
};

export default SovereignDirectives;
