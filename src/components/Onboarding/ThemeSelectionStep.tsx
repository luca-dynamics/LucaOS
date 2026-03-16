import React, { useState } from "react";
import { ArrowRight, Palette } from "lucide-react";
import { settingsService } from "../../services/settingsService";
import { THEME_PALETTE, setHexAlpha } from "../../config/themeColors";
import { useMobile } from "../../hooks/useMobile";

interface ThemeSelectionStepProps {
  onComplete: () => void;
  onThemeChange?: (themeName: UIThemeId) => void;
}

import { UIThemeId } from "../../types/lucaPersonality";

const THEMES = [
  {
    id: "PROFESSIONAL",
    label: "Professional",
    hex: THEME_PALETTE.PROFESSIONAL.primary,
    desc: "Light Grey / Minimal",
  },
  {
    id: "MASTER_SYSTEM",
    label: "Master System",
    hex: THEME_PALETTE.MASTER_SYSTEM.primary,
    desc: "Blue / High-Tech",
  },
  {
    id: "BUILDER",
    label: "Builder",
    hex: THEME_PALETTE.BUILDER.primary,
    desc: "Peach / Workspace",
  },
  {
    id: "TERMINAL",
    label: "Terminal",
    hex: THEME_PALETTE.TERMINAL.primary,
    desc: "Green / CLI",
  },
  {
    id: "AGENTIC_SLATE",
    label: "Agentic Slate",
    hex: THEME_PALETTE.AGENTIC_SLATE.primary,
    desc: "Slate / Professional",
  },
  {
    id: "MIDNIGHT",
    label: "Midnight",
    hex: THEME_PALETTE.MIDNIGHT.primary,
    desc: "OLED / Pure Black",
  },
  {
    id: "VAPORWAVE",
    label: "Vaporwave",
    hex: THEME_PALETTE.VAPORWAVE.primary,
    desc: "Neon / Retro",
  },
  {
    id: "FROST",
    label: "Frost",
    hex: THEME_PALETTE.FROST.primary,
    desc: "Ice / Glassmorphism",
  },
] as const;

const ThemeSelectionStep: React.FC<ThemeSelectionStepProps> = ({
  onComplete,
  onThemeChange,
}) => {
  const isElectron = !!(
    (window as any).electron && (window as any).electron.ipcRenderer
  );

  const [selectedTheme, setSelectedTheme] = useState<UIThemeId>(
    settingsService.get("general").theme as UIThemeId,
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState(
    settingsService.get("general").backgroundOpacity ?? 0.75,
  );
  const [backgroundBlur, setBackgroundBlur] = useState(
    settingsService.get("general").backgroundBlur ?? 12,
  );
  const isMobile = useMobile();

  const currentThemeHex =
    THEMES.find((t) => t.id === selectedTheme)?.hex || "#ffffff";

  const handleThemeSelect = (themeId: (typeof THEMES)[number]["id"]) => {
    setSelectedTheme(themeId);
    if (onThemeChange) {
      onThemeChange(themeId);
      // Persist immediately
      const currentGen = settingsService.get("general");
      settingsService.saveSettings({
        general: { ...currentGen, theme: themeId as any },
      });
    }
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) / 100;
    setBackgroundOpacity(val);
    const currentGen = settingsService.get("general");
    settingsService.saveSettings({
      general: { ...currentGen, backgroundOpacity: val },
    });
  };

  const handleBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setBackgroundBlur(val);
    const currentGen = settingsService.get("general");
    settingsService.saveSettings({
      general: { ...currentGen, backgroundBlur: val },
    });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div
        className="text-center"
        style={{
          gap: "2vmin",
          display: "flex",
          flexDirection: "column",
          marginBottom: "3vmin",
        }}
      >
        <Palette
          className="mx-auto transition-colors duration-300"
          style={{
            color: currentThemeHex,
            width: "clamp(2rem, 10vmin, 4rem)",
            height: "clamp(2rem, 10vmin, 4rem)",
            marginBottom: "2vmin",
          }}
        />
        <h1
          className="font-bold tracking-widest uppercase transition-colors duration-300"
          style={{
            color: currentThemeHex,
            fontSize: "clamp(1rem, 4.5vmin, 1.8rem)",
          }}
        >
          Interface Calibration
        </h1>
        <p
          className={`${["AGENTIC_SLATE", "LUCAGENT"].includes(selectedTheme) ? "text-slate-700" : "text-white/60"} uppercase tracking-wider font-bold`}
          style={{ fontSize: "clamp(0.5rem, 1.8vmin, 0.75rem)" }}
        >
          Configure visual style
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar px-4">
        {/* Theme Selection */}
        <section
          style={{ gap: "2.5vmin", display: "flex", flexDirection: "column" }}
        >
          <div
            className="grid grid-cols-2 sm:grid-cols-3"
            style={{ gap: "1.5vmin" }}
          >
            {THEMES.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className="relative flex items-center rounded-[1.5vmin] border transition-all text-left group backdrop-blur-md overflow-hidden"
                style={{
                  padding: "1.5vmin",
                  gap: "1.5vmin",
                  borderColor: "rgba(255,255,255,0.2)",
                  backgroundColor: setHexAlpha(t.hex, 0.12),
                  // ... rest of background styles ...
                  backgroundImage:
                    selectedTheme === t.id
                      ? `linear-gradient(135deg, ${setHexAlpha(t.hex, 0.25)} 0%, ${setHexAlpha(t.hex, 0.1)} 100%)`
                      : `linear-gradient(135deg, ${setHexAlpha(t.hex, 0.15)} 0%, ${setHexAlpha(t.hex, 0.05)} 100%)`,
                  boxShadow:
                    selectedTheme === t.id
                      ? `0 4px 20px ${setHexAlpha(t.hex, 0.2)}, inset 0 1px 0 ${setHexAlpha(t.hex, 0.2)}`
                      : `0 2px 10px ${setHexAlpha(t.hex, 0.06)}`,
                }}
              >
                {/* Theme indicator */}
                <div
                  className="rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    width: "clamp(1.5rem, 6vmin, 2.5rem)",
                    height: "clamp(1.5rem, 6vmin, 2.5rem)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="rounded-full transition-all"
                    style={{
                      width: "50%",
                      height: "50%",
                      backgroundColor: t.hex,
                      boxShadow: `0 0 15px ${setHexAlpha(t.hex, 0.5)}`,
                    }}
                  />
                  {selectedTheme === t.id && (
                    <div
                      className="absolute inset-0 rounded-full border-2 animate-pulse"
                      style={{ borderColor: t.hex, opacity: 0.5 }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold uppercase tracking-wider transition-colors truncate"
                    style={{
                      fontSize: "clamp(0.5rem, 1.8vmin, 0.8rem)",
                      color:
                        selectedTheme === t.id
                          ? t.id === "AGENTIC_SLATE" || t.id === "MIDNIGHT"
                            ? "#ffffff"
                            : t.hex
                          : ["PROFESSIONAL", "BUILDER", "FROST"].includes(
                                selectedTheme,
                              )
                            ? "rgba(0,0,0,0.6)"
                            : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {t.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Last row: centered under the grid */}
          <div className="flex justify-center" style={{ gap: "1.5vmin" }}>
            {THEMES.slice(6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className="relative flex items-center rounded-[1.5vmin] border transition-all text-left group backdrop-blur-md overflow-hidden"
                style={{
                  width: isMobile
                    ? "calc(50% - 0.75vmin)"
                    : "calc(33.333% - 1vmin)",
                  padding: "1.5vmin",
                  gap: "1.5vmin",
                  borderColor: "rgba(255,255,255,0.2)",
                  backgroundColor: setHexAlpha(t.hex, 0.12),
                  backgroundImage:
                    selectedTheme === t.id
                      ? `linear-gradient(135deg, ${setHexAlpha(t.hex, 0.25)} 0%, ${setHexAlpha(t.hex, 0.1)} 100%)`
                      : `linear-gradient(135deg, ${setHexAlpha(t.hex, 0.15)} 0%, ${setHexAlpha(t.hex, 0.05)} 100%)`,
                  boxShadow:
                    selectedTheme === t.id
                      ? `0 4px 20px ${setHexAlpha(t.hex, 0.2)}, inset 0 1px 0 ${setHexAlpha(t.hex, 0.2)}`
                      : `0 2px 10px ${setHexAlpha(t.hex, 0.06)}`,
                }}
              >
                {/* Theme indicator */}
                <div
                  className="rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    width: "clamp(1.5rem, 6vmin, 2.5rem)",
                    height: "clamp(1.5rem, 6vmin, 2.5rem)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="rounded-full transition-all"
                    style={{
                      width: "50%",
                      height: "50%",
                      backgroundColor: t.hex,
                      boxShadow: `0 0 15px ${setHexAlpha(t.hex, 0.5)}`,
                    }}
                  />
                  {selectedTheme === t.id && (
                    <div
                      className="absolute inset-0 rounded-full border-2 animate-pulse"
                      style={{ borderColor: t.hex, opacity: 0.5 }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold uppercase tracking-wider transition-colors truncate"
                    style={{
                      fontSize: "clamp(0.5rem, 1.8vmin, 0.8rem)",
                      color:
                        selectedTheme === t.id
                          ? t.id === "AGENTIC_SLATE" || t.id === "MIDNIGHT"
                            ? "#ffffff"
                            : t.hex
                          : ["PROFESSIONAL", "BUILDER", "FROST"].includes(
                                selectedTheme,
                              )
                            ? "rgba(0,0,0,0.6)"
                            : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {t.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Transparency Controls */}
        {isElectron && (
          <section
            style={{
              gap: "2.5vmin",
              display: "flex",
              flexDirection: "column",
              padding: "2.5vmin 0",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="text-center">
              <h2
                className="font-bold uppercase tracking-widest"
                style={{
                  color: currentThemeHex,
                  fontSize: "clamp(0.6rem, 1.8vmin, 0.85rem)",
                }}
              >
                Background Visibility
              </h2>
            </div>
            <div className="space-y-4 max-w-xs mx-auto w-full">
              <div
                style={{
                  gap: "1vmin",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="flex justify-between">
                  <span
                    className={`font-mono ${["AGENTIC_SLATE", "LUCAGENT"].includes(selectedTheme) ? "text-slate-600" : "text-gray-400"}`}
                    style={{ fontSize: "1.4vmin" }}
                  >
                    OPACITY
                  </span>
                  <span
                    className={`font-mono ${["AGENTIC_SLATE", "LUCAGENT"].includes(selectedTheme) ? "text-slate-800" : "text-gray-300"}`}
                    style={{ fontSize: "1.4vmin" }}
                  >
                    {Math.round(backgroundOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(backgroundOpacity * 100)}
                  onChange={handleOpacityChange}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: currentThemeHex }}
                />
              </div>
              <div
                style={{
                  gap: "1vmin",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="flex justify-between">
                  <span
                    className={`font-mono ${["AGENTIC_SLATE", "LUCAGENT"].includes(selectedTheme) ? "text-slate-600" : "text-gray-400"}`}
                    style={{ fontSize: "1.4vmin" }}
                  >
                    BLUR
                  </span>
                  <span
                    className={`font-mono ${["AGENTIC_SLATE", "LUCAGENT"].includes(selectedTheme) ? "text-slate-800" : "text-gray-300"}`}
                    style={{ fontSize: "1.4vmin" }}
                  >
                    {backgroundBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={backgroundBlur}
                  onChange={handleBlurChange}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: currentThemeHex }}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div
        className="pt-4 border-t border-white/10"
        style={{ marginTop: "3vmin", paddingBottom: "2vmin" }}
      >
        <button
          onClick={onComplete}
          className="w-full border py-3 uppercase tracking-widest transition-all flex items-center justify-center group backdrop-blur-md"
          style={{
            gap: "2vmin",
            padding: "2.5vmin 0",
            borderRadius: "1.5vmin",
            fontSize: "clamp(0.7rem, 2vmin, 0.9rem)",
            borderColor: "rgba(255,255,255,0.2)",
            backgroundColor: setHexAlpha(currentThemeHex, 0.12),
            backgroundImage: `linear-gradient(135deg, ${setHexAlpha(currentThemeHex, 0.25)} 0%, ${setHexAlpha(currentThemeHex, 0.1)} 100%)`,
            boxShadow: `0 4px 20px ${setHexAlpha(currentThemeHex, 0.15)}, inset 0 1px 0 ${setHexAlpha(currentThemeHex, 0.2)}`,
            color: currentThemeHex,
          }}
        >
          Confirm Style
          <ArrowRight
            className="group-hover:translate-x-1 transition-transform"
            style={{ width: "3vmin", height: "3vmin" }}
          />
        </button>
      </div>
    </div>
  );
};

export default ThemeSelectionStep;
