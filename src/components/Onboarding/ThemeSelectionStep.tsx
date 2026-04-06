import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { settingsService } from "../../services/settingsService";
import { THEME_PALETTE, getDynamicContrast } from "../../config/themeColors";
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
      "--app-id-backgroundOpacity",
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
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="text-center flex flex-col gap-4 mb-8">
        <Icon
          name="Palette"
          variant="BoldDuotone"
          className="mx-auto transition-colors duration-300 text-[var(--app-primary)]"
          size={56}
        />
        <div>
          <h1 className="font-black tracking-[0.2em] uppercase italic text-[var(--app-text-main)] text-2xl">
            Interface Calibration
          </h1>
          <p className="uppercase tracking-[0.3em] font-black mt-1 text-[10px] text-[var(--app-text-muted)]">
            Configure visual style
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar px-6">
        {/* Theme Selection */}
        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className={`relative flex items-center p-3.5 gap-3.5 rounded-2xl border transition-all text-left group overflow-hidden shadow-sm
                  ${
                    selectedTheme === t.id
                      ? "bg-[var(--app-primary)]/10 border-[var(--app-primary)]/40 scale-[1.02] shadow-lg shadow-[var(--app-primary)]/5"
                      : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                  }
                `}
              >
                <div
                  className={`w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-inner
                    ${selectedTheme === t.id ? "bg-[var(--app-primary)]/20" : "bg-black/40"}
                  `}
                >
                  <div
                    className="w-4 h-4 rounded-full transition-all duration-500 shadow-lg"
                    style={{
                      backgroundColor: t.hex,
                      boxShadow: `0 0 15px ${t.hex}80`,
                    }}
                  />
                  {selectedTheme === t.id && (
                    <div className="absolute inset-0 rounded-xl border-2 border-[var(--app-primary)]/40 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-black uppercase tracking-widest text-[9px] transition-colors truncate italic
                      ${selectedTheme === t.id ? "text-[var(--app-primary)]" : "text-[var(--app-text-main)]"}
                    `}
                  >
                    {t.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            {THEMES.slice(6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeSelect(t.id)}
                className={`relative flex items-center p-3.5 gap-3.5 rounded-2xl border transition-all text-left group overflow-hidden shadow-sm w-1/2
                  ${
                    selectedTheme === t.id
                      ? "bg-[var(--app-primary)]/10 border-[var(--app-primary)]/40 scale-[1.02] shadow-lg shadow-[var(--app-primary)]/5"
                      : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                  }
                `}
              >
                <div
                  className={`w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-inner
                    ${selectedTheme === t.id ? "bg-[var(--app-primary)]/20" : "bg-black/40"}
                  `}
                >
                  <div
                    className="w-4 h-4 rounded-full transition-all duration-500 shadow-lg"
                    style={{
                      backgroundColor: t.hex,
                      boxShadow: `0 0 15px ${t.hex}80`,
                    }}
                  />
                  {selectedTheme === t.id && (
                    <div className="absolute inset-0 rounded-xl border-2 border-[var(--app-primary)]/40 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-black uppercase tracking-widest text-[9px] transition-colors truncate italic
                      ${selectedTheme === t.id ? "text-[var(--app-primary)]" : "text-[var(--app-text-main)]"}
                    `}
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
          <section className="flex flex-col gap-6 py-6 border-t border-white/5">
            <div className="text-center">
              <h2 className="font-black uppercase tracking-[0.3em] text-[10px] text-[var(--app-text-muted)] italic">
                Background Visibility
              </h2>
            </div>
            <div className="space-y-6 max-w-xs mx-auto w-full">
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center px-1">
                  <span className="font-black font-mono text-[9px] tracking-widest text-[var(--app-text-muted)] uppercase">
                    Opacity
                  </span>
                  <span className="font-black font-mono text-[9px] tracking-widest text-[var(--app-primary)] uppercase">
                    {Math.round(backgroundOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(backgroundOpacity * 100)}
                  onChange={handleOpacityChange}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-black/40 border border-white/5 active:scale-[0.98] transition-transform"
                  style={{
                    accentColor: "var(--app-primary)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center px-1">
                  <span className="font-black font-mono text-[9px] tracking-widest text-[var(--app-text-muted)] uppercase">
                    Blur
                  </span>
                  <span className="font-black font-mono text-[9px] tracking-widest text-[var(--app-primary)] uppercase">
                    {backgroundBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={backgroundBlur}
                  onChange={handleBlurChange}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-black/40 border border-white/5 active:scale-[0.98] transition-transform"
                  style={{
                    accentColor: "var(--app-primary)",
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-6 border-t border-[var(--app-border-main)] mt-6">
        <button
          onClick={onComplete}
          className="w-full border border-[var(--app-border-main)] py-4 uppercase tracking-[0.4em] font-black italic text-xs transition-all flex items-center justify-center group bg-[var(--app-primary)]/10 hover:bg-[var(--app-primary)]/20 hover:border-[var(--app-primary)]/40 hover:scale-[1.01] active:scale-[0.99] rounded-2xl shadow-xl shadow-black/20 text-[var(--app-primary)]"
        >
          Confirm Style
          <Icon
            name="ArrowRight"
            variant="BoldDuotone"
            size={20}
            className="group-hover:translate-x-2 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};

export default ThemeSelectionStep;
