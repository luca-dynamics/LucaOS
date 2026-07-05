import React, { useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import { setHexAlpha } from "../../config/themeColors";
import type { UIThemeId } from "../../types/lucaPersonality";
import {
  DEFAULT_LUCA_SKIN_ID,
  LUCA_SKIN_IDS,
  LUCA_SKINS,
  normalizeLucaSkinId,
  type LucaSkinId,
} from "../../config/lucaSkins";
import { getLucaSkinPreviewMetadata } from "../../config/lucaSkinPreviewMetadata";
import { getLucaSkinMaterialVariables } from "../../styles/lucaSkinMaterialBridge";

interface ThemeSelectionStepProps {
  onComplete: () => void;
  onThemeChange?: (themeName: UIThemeId) => void;
  onSkinChange?: (skinId: LucaSkinId) => void;
  onOpacityChange?: (opacity: number) => void;
  initialTheme?: UIThemeId;
  initialSkinId?: unknown;
  initialBackgroundOpacity?: number;
  initialBackgroundBlur?: number;
  showTransparencyControls?: boolean;
  onVisualSettingsChange?: (settings: {
    theme?: UIThemeId;
    selectedSkinId?: LucaSkinId;
    backgroundOpacity?: number;
    backgroundBlur?: number;
  }) => void;
}

const LEGACY_THEME_BY_SKIN: Record<LucaSkinId, UIThemeId> = {
  pearl: "FROST",
  carbon: "PROFESSIONAL",
  flow: "FROST",
  canvas: "LIGHTCREAM",
  graphite: "MASTER_SYSTEM",
  onyx: "MASTER_SYSTEM",
  dusk: "MASTER_SYSTEM",
  mist: "FROST",
};

const ThemeSelectionStep: React.FC<ThemeSelectionStepProps> = ({
  onComplete,
  onThemeChange,
  onSkinChange,
  onOpacityChange,
  initialTheme = "PROFESSIONAL",
  initialSkinId,
  initialBackgroundOpacity = 0.3,
  initialBackgroundBlur = 40,
  showTransparencyControls = false,
  onVisualSettingsChange,
}) => {
  const [selectedSkinId, setSelectedSkinId] = useState<LucaSkinId>(() =>
    normalizeLucaSkinId(initialSkinId ?? DEFAULT_LUCA_SKIN_ID),
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState(
    initialBackgroundOpacity,
  );
  const [backgroundBlur, setBackgroundBlur] = useState(initialBackgroundBlur);

  const materialVariables = useMemo(
    () =>
      getLucaSkinMaterialVariables({
        skinId: selectedSkinId,
        hostKind: "desktop-app",
        userMaterialOpacity: backgroundOpacity,
        userMaterialBlurPx: backgroundBlur,
      }),
    [selectedSkinId, backgroundOpacity, backgroundBlur],
  );

  const selectedSkin = LUCA_SKINS[selectedSkinId];
  const textPrimary = materialVariables["--luca-text-primary"];
  const textSecondary = materialVariables["--luca-text-secondary"];
  const textTertiary = materialVariables["--luca-text-tertiary"];
  const accent = materialVariables["--luca-accent-primary"];
  const border = setHexAlpha(accent, 0.26);
  const panelBg = `color-mix(in srgb, ${materialVariables["--luca-surface-glass"]} ${Math.round(
    backgroundOpacity * 100,
  )}%, transparent)`;

  const handleSkinSelect = (skinId: LucaSkinId) => {
    const legacyTheme = LEGACY_THEME_BY_SKIN[skinId] ?? initialTheme;
    setSelectedSkinId(skinId);
    onSkinChange?.(skinId);
    onThemeChange?.(legacyTheme);
    onVisualSettingsChange?.({ selectedSkinId: skinId, theme: legacyTheme });
  };

  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10) / 100;
    setBackgroundOpacity(value);
    onOpacityChange?.(value);
    onVisualSettingsChange?.({ backgroundOpacity: value });
  };

  const handleBlurChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setBackgroundBlur(value);
    onVisualSettingsChange?.({ backgroundBlur: value });
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden animate-fade-in-up"
      style={materialVariables as React.CSSProperties}
    >
      <div className="shrink-0 space-y-1 text-center">
        <Icon
          name="Palette"
          variant="BoldDuotone"
          className="mx-auto mb-1 transition-colors duration-300"
          size={34}
          style={{ color: accent }}
        />
        <h1
          className="text-[1.55rem] font-bold tracking-[0.12em] uppercase transition-colors duration-300"
          style={{ color: textPrimary }}
        >
          Choose Luca's environment
        </h1>
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: textSecondary }}
        >
          Pick the skin LucaOS will use across the app
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 pt-4">
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {LUCA_SKIN_IDS.map((skinId) => {
            const skin = LUCA_SKINS[skinId];
            const metadata = getLucaSkinPreviewMetadata(skinId);
            const active = selectedSkinId === skinId;
            const swatchBackground = skin.backgroundProfile.hero;
            return (
              <button
                key={skinId}
                type="button"
                onClick={() => handleSkinSelect(skinId)}
                title={metadata.description}
                aria-pressed={active}
                aria-label={`${metadata.shortLabel}: ${metadata.tagline}`}
                className="group relative flex min-h-[104px] flex-col overflow-hidden rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5"
                style={{
                  borderColor: active ? accent : setHexAlpha(accent, 0.18),
                  background: active
                    ? `linear-gradient(135deg, ${setHexAlpha(
                        skin.accentProfile.primary,
                        0.2,
                      )}, ${panelBg})`
                    : panelBg,
                  boxShadow: active ? skin.materialProfile.shadowSoft : "none",
                }}
              >
                <span
                  aria-hidden="true"
                  className="mb-3 h-8 w-full rounded-lg border"
                  style={{
                    background: swatchBackground,
                    borderColor: setHexAlpha(skin.accentProfile.primary, 0.22),
                  }}
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: active ? accent : textPrimary }}
                >
                  {metadata.shortLabel}
                </span>
                <span
                  className="mt-1 text-[10px] leading-snug"
                  style={{ color: textTertiary }}
                >
                  {metadata.tagline}
                </span>
                {skin.recommendedDefault && (
                  <span
                    className="mt-2 w-fit rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em]"
                    style={{
                      color: accent,
                      background: setHexAlpha(accent, 0.12),
                    }}
                  >
                    Default
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {showTransparencyControls && (
          <section
            className="mt-4 space-y-3 rounded-xl border p-3"
            style={{ borderColor: border, background: panelBg }}
          >
            <div>
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: textPrimary }}
              >
                Background material
              </h2>
              <p className="mt-1 text-[10px]" style={{ color: textTertiary }}>
                Fine tune {selectedSkin.shortName}'s blur and opacity using the
                same material controls as Settings.
              </p>
            </div>
            {[
              {
                key: "opacity" as const,
                label: "Opacity",
                display: `${Math.round(backgroundOpacity * 100)}%`,
                min: 0,
                max: 100,
                value: Math.round(backgroundOpacity * 100),
                onChange: handleOpacityChange,
              },
              {
                key: "blur" as const,
                label: "Blur",
                display: `${backgroundBlur}px`,
                min: 0,
                max: 40,
                value: backgroundBlur,
                onChange: handleBlurChange,
              },
            ].map((slider) => (
              <label key={slider.key} className="block">
                <span
                  className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: textSecondary }}
                >
                  <span>{slider.label}</span>
                  <span>{slider.display}</span>
                </span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  value={slider.value}
                  onChange={slider.onChange}
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg"
                  style={{ accentColor: accent, backgroundColor: border }}
                />
              </label>
            ))}
          </section>
        )}
      </div>

      <div className="shrink-0 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={onComplete}
          className="flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-[13px] font-semibold uppercase tracking-[0.18em] transition-opacity hover:opacity-90"
          style={{
            borderColor: border,
            background: `linear-gradient(135deg, ${setHexAlpha(
              accent,
              0.18,
            )}, ${panelBg})`,
            color: textPrimary,
          }}
        >
          Use this environment
          <Icon
            name="ArrowRight"
            variant="BoldDuotone"
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </button>
      </div>
    </div>
  );
};

export default ThemeSelectionStep;
