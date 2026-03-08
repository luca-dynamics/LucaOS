import React, { useState } from "react";
import { ArrowRight, ShieldCheck, FileText } from "lucide-react";

interface LegalStepProps {
  onComplete: () => void;
  themeHex: string;
  isLightTheme?: boolean;
}

// Helper to convert hex to rgba (handles 6 or 8 character hex)
const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const LegalStep: React.FC<LegalStepProps> = ({
  onComplete,
  themeHex,
  isLightTheme = false,
}) => {
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agreed) {
      onComplete();
    }
  };

  // Theme-aware colors
  const textMuted = isLightTheme ? "text-slate-700" : "text-gray-200";
  const textSecondary = isLightTheme ? "text-slate-800" : "text-white/90";
  const textBody = isLightTheme ? "text-slate-700" : "text-gray-200";
  const borderColor = isLightTheme ? "border-slate-300" : "border-white/10";
  const hoverBg = isLightTheme ? "hover:bg-slate-100" : "hover:bg-white/5";
  const checkboxBorder = isLightTheme ? "border-slate-400" : "border-white/30";
  const checkboxHover = isLightTheme
    ? "group-hover:border-slate-600"
    : "group-hover:border-white/50";

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <ShieldCheck
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: themeHex }}
        />
        <h1
          className="text-2xl font-bold tracking-widest uppercase"
          style={{ color: themeHex }}
        >
          System Initialization
        </h1>
        <p className={`${textMuted} text-xs uppercase tracking-wider`}>
          Review protocols
        </p>
      </div>

      <div className="flex px-4">
        {/* 1. Legal Disclaimer */}
        <section className="space-y-4 w-full">
          <div
            className={`flex items-center gap-2 ${textSecondary} ${borderColor} border-b pb-2`}
          >
            <FileText size={16} />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Terms of Service
            </h2>
          </div>

          <div
            className={`border rounded-xl p-4 text-xs ${textBody} leading-relaxed font-mono backdrop-blur-md transition-all duration-300`}
            style={{
              borderColor: isLightTheme
                ? "rgba(0,0,0,0.15)"
                : "rgba(255,255,255,0.2)",
              backgroundColor: isLightTheme
                ? hexToRgba(themeHex, 0.08)
                : hexToRgba(themeHex, 0.1),
              backgroundImage: `linear-gradient(135deg, ${hexToRgba(
                themeHex,
                isLightTheme ? 0.12 : 0.18,
              )} 0%, ${hexToRgba(themeHex, isLightTheme ? 0.04 : 0.07)} 100%)`,
              boxShadow: isLightTheme
                ? `0 4px 30px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`
                : `0 4px 30px ${hexToRgba(themeHex, 0.08)}, inset 0 1px 0 ${hexToRgba(themeHex, 0.15)}`,
            }}
          >
            <p className="mb-3">
              <strong
                className={isLightTheme ? "text-slate-800" : "text-white/90"}
              >
                WARNING:
              </strong>{" "}
              You are accessing LucaOS, an advanced agentic operating system. By
              proceeding, you acknowledge:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>
                This software employs autonomous agents capable of executing
                commands on your behalf. You are solely responsible for all
                actions taken by the system.
              </li>
              <li>
                Data processed by local models remains on this device. Data sent
                to external AI providers is subject to their respective privacy
                policies.
              </li>
              <li>
                The &quot;Architect&quot; and &quot;Developer&quot; modes are
                experimental interfaces. Use with caution.
              </li>
            </ul>
          </div>

          <label
            className={`flex items-center gap-3 cursor-pointer group p-2 rounded-lg ${hoverBg} transition-colors`}
          >
            <div
              className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                agreed
                  ? "border-transparent"
                  : `${checkboxBorder} ${checkboxHover}`
              }`}
              style={{
                backgroundColor: agreed ? themeHex : "transparent",
                borderColor: agreed ? themeHex : undefined,
              }}
            >
              {agreed && (
                <ArrowRight
                  size={12}
                  className={isLightTheme ? "text-white" : "text-black"}
                  style={{ transform: "rotate(-45deg)" }}
                />
              )}
            </div>
            <span
              className={`text-sm transition-colors ${
                agreed
                  ? isLightTheme
                    ? "text-slate-900"
                    : "text-white"
                  : `${textMuted} ${isLightTheme ? "group-hover:text-slate-700" : "group-hover:text-white/80"}`
              }`}
            >
              I accept the responsibility and terms of use
            </span>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="hidden"
            />
          </label>
        </section>
      </div>

      {/* Footer Actions */}
      <div className={`mt-8 pt-4 pb-4 ${borderColor} border-t px-4`}>
        <button
          onClick={handleSubmit}
          disabled={!agreed}
          className="w-full border rounded-xl py-3 uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md"
          style={{
            borderColor: isLightTheme
              ? "rgba(0,0,0,0.15)"
              : "rgba(255,255,255,0.2)",
            backgroundColor: hexToRgba(themeHex, isLightTheme ? 0.15 : 0.1),
            backgroundImage: `linear-gradient(135deg, ${hexToRgba(
              themeHex,
              isLightTheme ? 0.25 : 0.2,
            )} 0%, ${hexToRgba(themeHex, isLightTheme ? 0.1 : 0.08)} 100%)`,
            boxShadow: isLightTheme
              ? `0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)`
              : `0 4px 20px ${hexToRgba(themeHex, 0.1)}, inset 0 1px 0 ${hexToRgba(themeHex, 0.15)}`,
            color: agreed
              ? themeHex
              : isLightTheme
                ? "rgba(0,0,0,0.6)"
                : "rgba(255,255,255,0.7)",
          }}
        >
          Initialize System
          <ArrowRight
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};

export default LegalStep;
