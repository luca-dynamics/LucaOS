import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { settingsService } from "../../services/settingsService";
import {
  THEME_PALETTE,
  getDynamicContrast,
  setHexAlpha,
} from "../../config/themeColors";
import { UIThemeId } from "../../types/lucaPersonality";

interface ThemeSelectionStepProps {
  onComplete: () => void;
  onThemeChange?: (themeName: UIThemeId) => void;
  onOpacityChange?: (opacity: number) => void;
}

const THEMES = [
  {
    id: "PROFESSIONAL",
    label: "Professional",
    hex: "#C6C6C6",
    desc: "Light Grey / Minimal",
  },
  {
    id: "MASTER_SYSTEM",
    label: "Master System",
    hex: "#22d3ee",
    desc: "Blue / High-Tech",
  },
  {
    id: "BUILDER",
    label: "Builder",
    hex: "#f97316",
    desc: "Peach / Workspace",
  },
  {
    id: "TERMINAL",
    label: "Terminal",
    hex: "#22c55e",
    desc: "Green / CLI",
  },
  {
    id: "AGENTIC_SLATE",
    label: "Agentic Slate",
    hex: "#64748b",
    desc: "Slate / Professional",
  },
  {
    id: "LIGHTCREAM",
    label: "Light Cream",
    hex: "#E5E1CD",
    desc: "Cream / Minimal",
  },
  {
    id: "VAPORWAVE",
    label: "Vaporwave",
    hex: "#f471b5",
    desc: "Neon / Retro",
  },
  {
    id: "FROST",
    label: "Frost",
    hex: "#93c5fd",
    desc: "Ice / Glassmorphism",
  },
] as const;

const ThemeSelectionStep: React.FC<ThemeSelectionStepProps> = ({
  onComplete,
  onThemeChange,
  onOpacityChange,
}) => {
  const isElectron = !!(
    (window as any).electron && (window as any).electron.ipcRenderer
  );

  const [selectedTheme, setSelectedTheme] = useState<UIThemeId>(
    settingsService.get("general").theme as UIThemeId,
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState(
    settingsService.get("general").backgroundOpacity ?? 0.3,
  );
  const [backgroundBlur, setBackgroundBlur] = useState(
    settingsService.get("general").backgroundBlur ?? 40,
  );
  const currentThemeHex =
    THEMES.find((t) => t.id === selectedTheme)?.hex || "#ffffff";
  const currentContrast = getDynamicContrast(selectedTheme, backgroundOpacity);
  const isLightSelection =
    selectedTheme === "LIGHTCREAM" || selectedTheme === "AGENTIC_SLATE";
  const headingColor = isLightSelection ? currentContrast.text : currentThemeHex;

  // Dynamic Contrast logic - Now purely reactive logic
  const updateVisualCoreVariables = (themeId: string, opacity: number) => {
    const root = document.documentElement;
    const theme =
      THEME_PALETTE[themeId as keyof typeof THEME_PALETTE] ||
      THEME_PALETTE.PROFESSIONAL;
    root.style.setProperty("--app-primary", theme.primary);

    // Apply global dynamic contrast variables
    const dynamicContrast = getDynamicContrast(themeId, opacity);
    root.style.setProperty("--app-text-main", dynamicContrast.text);
    root.style.setProperty("--app-text-muted", dynamicContrast.textMuted);
    root.style.setProperty("--app-border-main", dynamicContrast.border);
    root.style.setProperty("--app-bg-tint", dynamicContrast.bgTint);
  };

  // Sync initial state and updates
  useEffect(() => {
    updateVisualCoreVariables(selectedTheme, backgroundOpacity);
  }, [selectedTheme, backgroundOpacity]);

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
    if (onOpacityChange) onOpacityChange(val);
    const currentGen = settingsService.get("general");
    settingsService.saveSettings({
      general: { ...currentGen, backgroundOpacity: val },
    });
    // Live Preview
    document.documentElement.style.setProperty(
      "--app-bg-opacity",
      val.toString(),
    );
  };

  const handleBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setBackgroundBlur(val);
    const currentGen = settingsService.get("general");
    settingsService.saveSettings({
      general: { ...currentGen, backgroundBlur: val },
    });
    // Live Preview
    document.documentElement.style.setProperty("--app-bg-blur", `${val}px`);
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in-up overflow-hidden">
      {/* Header */}
      <div className="text-center space-y-1 mb-4 shrink-0">
        <Icon
          name="Palette"
          variant="BoldDuotone"
          className="mx-auto mb-1 transition-colors duration-300"
          size={34}
          style={{ color: headingColor }}
        />
        <h1
          className="text-[1.55rem] font-bold tracking-[0.16em] uppercase italic transition-colors duration-300"
          style={{ color: headingColor }}
        >
          Interface Calibration
        </h1>
        <p className="text-xs uppercase tracking-wider font-bold text-[var(--app-text-main)] opacity-85">
          Configure visual style
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden space-y-4 px-2">
        {/* Theme Selection */}
        <section className="space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEMES.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className="relative flex items-center gap-2 p-2 rounded-xl border transition-all text-left group backdrop-blur-md h-[62px]"
                style={{
                  borderColor:
                    selectedTheme === t.id
                      ? setHexAlpha(t.hex, 0.42)
                      : currentContrast.border,
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
                <div
                    className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: currentContrast.bgTint,
                    borderColor: currentContrast.border,
                  }}
                >
                  <div
                    className="h-3.5 w-3.5 rounded-full transition-all"
                    style={{
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
                    className="text-[10px] font-bold uppercase tracking-[0.06em] transition-colors truncate leading-tight"
                    style={{
                      color:
                        selectedTheme === t.id
                          ? t.id === "LIGHTCREAM" || t.id === "AGENTIC_SLATE"
                            ? currentContrast.text
                            : t.hex
                          : currentContrast.text,
                    }}
                  >
                    {t.label}
                  </div>
                  <div
                    className="text-[9px] font-medium truncate leading-tight"
                    style={{ color: currentContrast.textMuted }}
                  >
                    {t.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-2.5">
            {THEMES.slice(6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className="relative flex items-center gap-2 p-2 rounded-xl border transition-all text-left group backdrop-blur-md w-[calc(33.333%-0.25rem)] h-[62px]"
                style={{
                  borderColor:
                    selectedTheme === t.id
                      ? setHexAlpha(t.hex, 0.42)
                      : currentContrast.border,
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
                <div
                    className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: currentContrast.bgTint,
                    borderColor: currentContrast.border,
                  }}
                >
                  <div
                    className="h-3.5 w-3.5 rounded-full transition-all"
                    style={{
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
                    className="text-[10px] font-bold uppercase tracking-[0.06em] transition-colors truncate leading-tight"
                    style={{
                      color:
                        selectedTheme === t.id
                          ? t.id === "LIGHTCREAM" || t.id === "AGENTIC_SLATE"
                            ? currentContrast.text
                            : t.hex
                          : currentContrast.text,
                    }}
                  >
                    {t.label}
                  </div>
                  <div
                    className="text-[9px] font-medium truncate leading-tight"
                    style={{ color: currentContrast.textMuted }}
                  >
                    {t.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Transparency Controls */}
        {isElectron && (
          <section
            className="space-y-2 pt-2 pb-1"
            style={{ borderTop: `1px solid ${currentContrast.border}` }}
          >
            <div className="text-center mb-1">
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: currentContrast.text }}
              >
                Background Visibility
              </h2>
              <p
                className="text-[9px] mt-0.5"
                style={{ color: currentContrast.textMuted }}
              >
                Adjust UI Transparency
              </p>
            </div>
            <div className="space-y-3 max-w-lg mx-auto">
              <div>
                <div className="flex justify-between mb-1">
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: currentContrast.textMuted }}
                  >
                    OPACITY
                  </span>
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: currentContrast.text }}
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
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: currentThemeHex,
                    backgroundColor: currentContrast.bgTint,
                  }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: currentContrast.textMuted }}
                  >
                    BLUR
                  </span>
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: currentContrast.text }}
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
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: currentThemeHex,
                    backgroundColor: currentContrast.bgTint,
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div
        className="mt-3 pt-2 pb-2 px-3 shrink-0"
        style={{ borderTop: `1px solid ${currentContrast.border}` }}
      >
        <button
          onClick={onComplete}
          className="w-full border rounded-xl py-2 uppercase tracking-[0.22em] text-[13px] transition-all flex items-center justify-center gap-2 group backdrop-blur-md"
          style={{
            borderColor: currentContrast.border,
            backgroundColor: currentContrast.bgTint,
            backgroundImage: `linear-gradient(135deg, ${currentContrast.bgTint} 0%, ${setHexAlpha(
              currentThemeHex,
              isLightSelection ? 0.05 : 0.1,
            )} 100%)`,
            boxShadow: `0 4px 20px ${setHexAlpha(
              currentThemeHex,
              isLightSelection ? 0.06 : 0.15,
            )}, inset 0 1px 0 ${setHexAlpha(currentThemeHex, isLightSelection ? 0.08 : 0.2)}`,
            color: currentContrast.text,
          }}
        >
          Confirm Style
          <Icon
            name="ArrowRight"
            variant="BoldDuotone"
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};

export default ThemeSelectionStep;
