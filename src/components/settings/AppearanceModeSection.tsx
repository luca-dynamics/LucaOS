import React from "react";
import {
  DEFAULT_LUCA_APPEARANCE_MODE,
  LUCA_SKINS,
  isLucaAppearanceMode,
  resolveLucaAppearanceSkinId,
  type LucaAppearanceMode,
  type LucaSkinId,
} from "../../config/lucaSkins";
import { SettingsSection } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

/**
 * AppearanceModeSection — the primary appearance control for LucaOS.
 *
 * LucaOS wears ONE identity (the glacier) in light (Luca Light) or dark
 * (Luca Dark); "System" follows the device. This is the Claude-desktop model:
 * a mode, not a gallery. The wider skin catalog remains available underneath
 * as an optional "more environments" choice.
 *
 * Scoped + inert like the rest of Settings: it reports the chosen mode AND the
 * skin that mode resolves to, and never writes to document/root styles itself.
 */

export const APPEARANCE_MODE_HELPER_COPY =
  "Choose how LucaOS looks. One identity, in light or dark.";

interface AppearanceModeOption {
  id: LucaAppearanceMode;
  title: string;
  description: string;
  /** Preview art: the mode's real glacier background. */
  preview: string;
  darkPreview: boolean;
}

const APPEARANCE_MODE_OPTIONS: AppearanceModeOption[] = [
  {
    id: "light",
    title: "Luca Light",
    description: "The glacier-bright LucaOS look.",
    preview: LUCA_SKINS.pearl.backgroundProfile.hero,
    darkPreview: false,
  },
  {
    id: "dark",
    title: "Luca Dark",
    description: "The same identity, tuned for night.",
    preview: LUCA_SKINS.carbon.backgroundProfile.hero,
    darkPreview: true,
  },
  {
    id: "system",
    title: "System",
    description: "Match your device appearance.",
    preview:
      "linear-gradient(105deg, #e2edf2 0%, #d8e4ec 49.8%, #131c22 50.2%, #0c1216 100%)",
    darkPreview: false,
  },
];

export interface AppearanceModeSectionProps {
  accentColor?: string;
  isMobile?: boolean;
  appearanceMode?: unknown;
  /** Reports the chosen mode and the skin it resolves to (system → OS). */
  onAppearanceModeChange?: (
    mode: LucaAppearanceMode,
    resolvedSkinId: LucaSkinId,
  ) => void;
}

export const AppearanceModeSection: React.FC<AppearanceModeSectionProps> = ({
  accentColor,
  isMobile,
  appearanceMode,
  onAppearanceModeChange,
}) => {
  const currentMode = isLucaAppearanceMode(appearanceMode)
    ? appearanceMode
    : DEFAULT_LUCA_APPEARANCE_MODE;

  const handleSelect = (mode: LucaAppearanceMode) => {
    if (!onAppearanceModeChange) return;
    const prefersDark =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches === true;
    onAppearanceModeChange(mode, resolveLucaAppearanceSkinId(mode, prefersDark));
  };

  return (
    <SettingsSection
      title="Appearance"
      description={APPEARANCE_MODE_HELPER_COPY}
      icon="Palette"
      accentColor={accentColor}
      isMobile={isMobile}
    >
      <div
        role="radiogroup"
        aria-label="Appearance mode"
        data-luca-appearance-modes
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {APPEARANCE_MODE_OPTIONS.map((option) => {
          const isSelected = option.id === currentMode;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-luca-appearance-mode={option.id}
              onClick={() => handleSelect(option.id)}
              className="flex flex-col gap-0 rounded-2xl p-2.5 text-left transition-shadow"
              style={{
                cursor: onAppearanceModeChange ? "pointer" : "default",
                border: isSelected
                  ? `1.6px solid ${accentColor ?? settingsSurfaceTokens.textPrimary}`
                  : `1px solid ${settingsSurfaceTokens.borderSubtle}`,
                background: settingsSurfaceTokens.glass,
                boxShadow: isSelected
                  ? `0 0 0 3px ${accentColor ?? "rgba(120,150,190,0.3)"}22`
                  : "none",
              }}
            >
              {/* Mini UI preview painted with the mode's real glacier. */}
              <span
                aria-hidden="true"
                className="relative block overflow-hidden rounded-xl"
                style={{
                  height: 92,
                  background: option.preview,
                  border: `1px solid ${settingsSurfaceTokens.borderSubtle}`,
                }}
              >
                <span
                  className="absolute rounded-md"
                  style={{
                    left: 6,
                    top: 6,
                    bottom: 6,
                    width: 18,
                    background: option.darkPreview
                      ? "rgba(255, 255, 255, 0.09)"
                      : "rgba(255, 255, 255, 0.5)",
                  }}
                />
                {[0, 1, 2].map((row) => (
                  <span
                    key={row}
                    className="absolute rounded-md"
                    style={{
                      left: 30,
                      right: 6,
                      top: 7 + row * 21,
                      height: 16,
                      background: option.darkPreview
                        ? "rgba(255, 255, 255, 0.07)"
                        : "rgba(255, 255, 255, 0.42)",
                    }}
                  />
                ))}
              </span>

              <span
                className="mt-2.5 flex items-center justify-between gap-2 text-sm font-semibold"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {option.title}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ background: accentColor ?? "#3d8fa6" }}
                  >
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.5l4.3 4.3L19 7.4" />
                    </svg>
                  </span>
                )}
              </span>
              <span
                className="mt-0.5 text-xs leading-relaxed"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
};

export default AppearanceModeSection;
