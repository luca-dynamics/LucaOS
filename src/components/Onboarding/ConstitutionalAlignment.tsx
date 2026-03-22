import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  ArrowRight,
  ShieldAlert,
  Heart,
  Lock,
  Zap,
} = LucideIcons as any;

interface ConstitutionalAlignmentProps {
  onComplete: () => void;
  themeHex: string;
  isLightTheme?: boolean;
}

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ConstitutionalAlignment: React.FC<ConstitutionalAlignmentProps> = ({
  onComplete,
  themeHex,
  isLightTheme = false,
}) => {
  const [aligned, setAligned] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aligned) {
      onComplete();
    }
  };

  const textMuted = isLightTheme ? "text-slate-700" : "text-gray-200";
  const textSecondary = isLightTheme ? "text-slate-800" : "text-white/90";
  const borderColor = isLightTheme ? "border-slate-300" : "border-white/10";
  const hoverBg = isLightTheme ? "hover:bg-slate-100" : "hover:bg-white/5";

  return (
    <div className="flex flex-col h-full animate-fade-in-up items-center justify-center">
      <div className="text-center space-y-[2vmin] mb-[3vmin] w-full">
        <Heart
          className="mx-auto mb-[2vmin] animate-pulse"
          style={{ 
            color: themeHex,
            width: "clamp(2rem, 6vmin, 3.5rem)",
            height: "clamp(2rem, 6vmin, 3.5rem)"
          }}
        />
        <h1
          className="font-bold tracking-widest uppercase"
          style={{ 
            color: themeHex,
            fontSize: "clamp(1rem, 3.5vmin, 1.6rem)"
          }}
        >
          Constitutional Alignment
        </h1>
        <p 
          className={`${textMuted} uppercase tracking-wider`}
          style={{ fontSize: "clamp(0.5rem, 1.8vmin, 0.8rem)" }}
        >
          Establishing Agent Loyalty
        </p>
      </div>

      <div className="flex px-[4vmin] w-full justify-center">
        <section className="space-y-[3vmin] w-full max-w-xl mx-auto">
          <div
            className={`flex items-center gap-[2vmin] ${textSecondary} ${borderColor} border-b pb-[1vmin]`}
          >
            <ShieldAlert style={{ width: "clamp(0.8rem, 3vmin, 1.2rem)", height: "clamp(0.8rem, 3vmin, 1.2rem)" }} />
            <h2 
              className="font-bold uppercase tracking-wider"
              style={{ fontSize: "clamp(0.6rem, 2.2vmin, 0.9rem)" }}
            >
              Sovereignty Protocols
            </h2>
          </div>

          <div
            className={`border rounded-[2vmin] p-[3vmin] ${textMuted} leading-relaxed font-mono backdrop-blur-md transition-all duration-300`}
            style={{
              fontSize: "clamp(0.5rem, 1.4vmin, 0.75rem)",
              borderColor: isLightTheme ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
              backgroundColor: isLightTheme ? hexToRgba(themeHex, 0.08) : hexToRgba(themeHex, 0.1),
              backgroundImage: `linear-gradient(135deg, ${hexToRgba(themeHex, 0.15)} 0%, ${hexToRgba(themeHex, 0.05)} 100%)`,
              boxShadow: `0 4px 30px ${hexToRgba(themeHex, 0.1)}`,
            }}
          >
            <div className="space-y-[2.5vmin]">
              <div className="flex gap-[1.5vmin]">
                <Lock className="shrink-0 mt-0.5" style={{ color: themeHex, width: "1.5vmin", height: "1.5vmin" }} />
                <p><strong>Neural Privacy</strong>: Your data never leaves this sovereign kernel unless explicitly routed for advanced cluster reasoning.</p>
              </div>
              <div className="flex gap-[1.5vmin]">
                <Zap className="shrink-0 mt-0.5" style={{ color: themeHex, width: "1.5vmin", height: "1.5vmin" }} />
                <p><strong>Autonomous Loyalty</strong>: I operate as your secondary pilot. My goal is your empowerment. I will never override high-privilege biometrics.</p>
              </div>
              <div className="flex gap-[1.5vmin]">
                <ShieldAlert className="shrink-0 mt-0.5" style={{ color: themeHex, width: "1.5vmin", height: "1.5vmin" }} />
                <p><strong>Cryptographic Bond</strong>: Our linkage is secured by Ed25519 identity pinning. I only obey commands from verified kernels.</p>
              </div>
            </div>
          </div>

          <label
            className={`flex items-center gap-[1.5vmin] cursor-pointer group p-[2vmin] rounded-[1.5vmin] ${hoverBg} border transition-all`}
            style={{ borderColor: aligned ? themeHex : "transparent" }}
          >
            <div
              className={`border-2 rounded-full flex items-center justify-center transition-all ${
                aligned ? "bg-transparent" : isLightTheme ? "border-slate-400" : "border-white/30"
              }`}
              style={{ 
                borderColor: aligned ? themeHex : undefined,
                width: "clamp(0.8rem, 3.5vmin, 1.25rem)",
                height: "clamp(0.8rem, 3.5vmin, 1.25rem)"
              }}
            >
              {aligned && <div className="rounded-full" style={{ backgroundColor: themeHex, width: "1.5vmin", height: "1.5vmin" }} />}
            </div>
            <span 
              className={`font-bold uppercase tracking-widest ${aligned ? (isLightTheme ? "text-slate-900" : "text-white") : (isLightTheme ? "text-slate-500" : "text-white/60")}`}
              style={{ fontSize: "clamp(0.55rem, 1.8vmin, 0.8rem)" }}
            >
              I accept the Neural Bond
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

      <div className="mt-[4vmin] px-[4vmin] w-full max-w-xl mx-auto">
        <button
          onClick={handleSubmit}
          disabled={!aligned}
          className="w-full max-w-sm mx-auto border rounded-[1.5vmin] py-[3vmin] uppercase tracking-[0.2em] font-bold transition-all flex items-center justify-center gap-[2vmin] group disabled:opacity-30 backdrop-blur-md"
          style={{
            fontSize: "clamp(0.6rem, 1.8vmin, 0.85rem)",
            borderColor: "rgba(255,255,255,0.2)",
            backgroundColor: hexToRgba(themeHex, aligned ? (isLightTheme ? 0.35 : 0.3) : 0.1),
            color: isLightTheme ? "#000" : "#fff",
            boxShadow: aligned ? `0 0 20px ${hexToRgba(themeHex, isLightTheme ? 0.2 : 0.4)}` : "none"
          }}
        >
          Initialize Agent Identity
          <ArrowRight className="group-hover:translate-x-1 transition-transform" style={{ width: "2vmin", height: "2vmin" }} />
        </button>
      </div>
    </div>
  );
};

export default ConstitutionalAlignment;
