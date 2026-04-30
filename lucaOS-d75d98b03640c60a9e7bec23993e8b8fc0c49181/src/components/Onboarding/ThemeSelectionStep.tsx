import React, { useState } from "react";
import { ArrowRight, Palette } from "lucide-react";
import { settingsService } from "../../services/settingsService";
import { THEME_PALETTE, setHexAlpha } from "../../config/themeColors";

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
      <div className="text-center space-y-2 mb-8">
        <Palette
          className="w-12 h-12 mx-auto mb-4 transition-colors duration-300"
          style={{ color: currentThemeHex }}
        />
        <h1
          className="text-2xl font-bold tracking-widest uppercase transition-colors duration-300"
          style={{ color: currentThemeHex }}
        >
          Interface Calibration
        </h1>
        <p className="text-gray-100 text-xs uppercase tracking-wider font-bold">
          Configure visual style
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar px-4">
        {/* Theme Selection */}
        <section className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {THEMES.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className="relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left group backdrop-blur-md"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  backgroundColor: setHexAlpha(t.hex, 0.12),
                  backgroundImage:
                    selectedTheme === t.id
                      ? `linear-gradient(135deg, ${setHexAlpha(
                          t.hex,
                          0.25,
                        )} 0%, ${setHexAlpha(t.hex, 0.1)} 100%)`
                      : `linear-gradient(135deg, ${setHexAlpha(
                          t.hex,
                          0.15,
                        )} 0%, ${setHexAlpha(t.hex, 0.05)} 100%)`,
                  boxShadow:
                    selectedTheme === t.id
                      ? `0 4px 20px ${setHexAlpha(
                          t.hex,
                          0.2,
                        )}, inset 0 1px 0 ${setHexAlpha(t.hex, 0.2)}`
                      : `0 2px 10px ${setHexAlpha(t.hex, 0.06)}`,
                }}
              >
                {/* Theme Circle & Glow - Perfectly proportioned indicator style */}
                <div
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full transition-all"
                    style={{
                      backgroundColor: t.hex,
                      boxShadow: `0 0 15px ${setHexAlpha(t.hex, 0.5)}`,
                    }}
                  />

                  {/* Outer glow ring for selected state */}
                  {selectedTheme === t.id && (
                    <div
                      className="absolute inset-0 rounded-full border-2 animate-pulse"
                      style={{ borderColor: t.hex, opacity: 0.5 }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0 ml-1">
                  <div
                    className="text-xs font-bold uppercase tracking-wider transition-colors truncate"
                    style={{
                      color:
                        selectedTheme === t.id
                          ? t.id === "AGENTIC_SLATE"
                            ? "#ffffff"
                            : t.hex
                          : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {t.label}
                  </div>
                  <div className="text-[10px] text-gray-200 font-medium truncate">
                    {t.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Last row: centered under the 3-column grid */}
          <div className="flex justify-center gap-3">
            {THEMES.slice(6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className="relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left group backdrop-blur-md w-[calc(33.333%-0.5rem)]"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  backgroundColor: setHexAlpha(t.hex, 0.12),
                  backgroundImage:
                    selectedTheme === t.id
                      ? `linear-gradient(135deg, ${setHexAlpha(
                          t.hex,
                          0.25,
                        )} 0%, ${setHexAlpha(t.hex, 0.1)} 100%)`
                      : `linear-gradient(135deg, ${setHexAlpha(
                          t.hex,
                          0.15,
                        )} 0%, ${setHexAlpha(t.hex, 0.05)} 100%)`,
                  boxShadow:
                    selectedTheme === t.id
                      ? `0 4px 20px ${setHexAlpha(
                          t.hex,
                          0.2,
                        )}, inset 0 1px 0 ${setHexAlpha(t.hex, 0.2)}`
                      : `0 2px 10px ${setHexAlpha(t.hex, 0.06)}`,
                }}
              >
                {/* Theme Circle & Glow - Perfectly proportioned indicator style */}
                <div
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full transition-all"
                    style={{
                      backgroundColor: t.hex,
                      boxShadow: `0 0 15px ${setHexAlpha(t.hex, 0.5)}`,
                    }}
                  />

                  {/* Outer glow ring for selected state */}
                  {selectedTheme === t.id && (
                    <div
                      className="absolute inset-0 rounded-full border-2 animate-pulse"
                      style={{ borderColor: t.hex, opacity: 0.5 }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0 ml-1">
                  <div
                    className="text-xs font-bold uppercase tracking-wider transition-colors truncate"
                    style={{
                      color:
                        selectedTheme === t.id
                          ? t.id === "AGENTIC_SLATE"
                            ? "#ffffff"
                            : t.hex
                          : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {t.label}
                  </div>
                  <div className="text-[10px] text-gray-200 font-medium truncate">
                    {t.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Transparency Controls - Only visible on Electron */}
        {isElectron && (
          <section className="space-y-4 pt-4 border-t border-white/5 pb-4">
            <div className="text-center mb-4">
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: currentThemeHex }}
              >
                Background Visibility
              </h2>
              <p className="text-[10px] text-gray-400 mt-1">
                Adjust UI Transparency
              </p>
            </div>
            <div className="space-y-6 max-w-xs mx-auto">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-400">
                    OPACITY
                  </span>
                  <span className="text-[10px] font-mono text-gray-300">
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
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-400">
                    BLUR
                  </span>
                  <span className="text-[10px] font-mono text-gray-300">
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
      <div className="mt-8 pt-4 pb-4 border-t border-white/10 px-4">
        <button
          onClick={onComplete}
          className="w-full border rounded-xl py-3 uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 group backdrop-blur-md"
          style={{
            borderColor: "rgba(255,255,255,0.2)",
            backgroundColor: setHexAlpha(currentThemeHex, 0.12),
            backgroundImage: `linear-gradient(135deg, ${setHexAlpha(
              currentThemeHex,
              0.25,
            )} 0%, ${setHexAlpha(currentThemeHex, 0.1)} 100%)`,
            boxShadow: `0 4px 20px ${setHexAlpha(
              currentThemeHex,
              0.15,
            )}, inset 0 1px 0 ${setHexAlpha(currentThemeHex, 0.2)}`,
            color: currentThemeHex,
          }}
        >
          Confirm Style
          <ArrowRight
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};

export default ThemeSelectionStep;
