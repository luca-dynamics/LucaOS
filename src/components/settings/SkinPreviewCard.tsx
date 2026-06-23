import React from "react";
import { Icon } from "../ui/Icon";
import {
  type LucaSkinPreviewCapability,
  type LucaSkinPreviewMetadata,
  type LucaSkinPreviewMood,
} from "../../config/lucaSkinPreviewMetadata";
import { getLucaSkinMaterialVariables } from "../../styles/lucaSkinMaterialBridge";
import type { LucaSkinId } from "../../config/lucaSkins";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

/**
 * Local-only, preview-only skin card for Settings.
 *
 * This component renders a small "operating environment sample" for a single
 * LucaOS skin. It is intentionally inert:
 *
 * - It does NOT apply skins globally, persist selection, or change the active
 *   appearance.
 * - It does NOT write to `document.documentElement` or call `style.setProperty`.
 * - Skin CSS variables from `getLucaSkinMaterialVariables` are applied ONLY as
 *   inline styles on the local sample box, scoping them to that subtree.
 *
 * The card chrome (title, chips, copy) uses the active-theme settings tokens so
 * it stays consistent with the current interface; only the sample box reflects
 * the skin's own colors.
 */

const MOOD_LABELS: Record<LucaSkinPreviewMood, string> = {
  "calm-light": "Calm light",
  "focused-dark": "Focused dark",
  "liquid-adaptive": "Liquid adaptive",
  "warm-editorial": "Warm editorial",
};

// Recommended-default is surfaced as its own marker, so it is not repeated as a
// capability indicator chip.
const CAPABILITY_LABELS: Record<
  Exclude<LucaSkinPreviewCapability, "recommended-default">,
  string
> = {
  "high-readability": "High readability",
  "low-motion-safe": "Low motion",
  "reduced-transparency-safe": "Reduced transparency safe",
  "mobile-safe": "Mobile safe",
  "developer-focus": "Developer focus",
  "writing-focus": "Writing focus",
  "ambient-identity": "Ambient identity",
};

export interface SkinPreviewCardProps {
  metadata: LucaSkinPreviewMetadata;
  isSelected?: boolean;
  onSelect?: (skinId: LucaSkinId) => void;
}

export const SkinPreviewCard: React.FC<SkinPreviewCardProps> = ({
  metadata,
  isSelected = false,
  onSelect,
}) => {
  const isRecommended = metadata.capabilities.includes("recommended-default");

  // Local-only: scope skin variables to the sample box subtree. Static and
  // reduced-motion-safe — no animation is introduced in this preview.
  const sampleVariables = getLucaSkinMaterialVariables({
    skinId: metadata.id,
    reducedMotion: true,
  }) as React.CSSProperties;

  const indicators = metadata.capabilities.filter(
    (
      capability,
    ): capability is Exclude<
      LucaSkinPreviewCapability,
      "recommended-default"
    > => capability !== "recommended-default",
  );

  const isInteractive = typeof onSelect === "function";
  const CardElement = isInteractive ? "button" : "div";

  return (
    <CardElement
      type={isInteractive ? "button" : undefined}
      aria-pressed={isInteractive ? isSelected : undefined}
      aria-label={
        isInteractive
          ? `Save ${metadata.label} as current skin preference`
          : undefined
      }
      onClick={isInteractive ? () => onSelect?.(metadata.id) : undefined}
      className="flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        backgroundColor: settingsSurfaceTokens.glass,
        borderColor: isSelected
          ? settingsSurfaceTokens.accentPrimary
          : isRecommended
            ? settingsSurfaceTokens.accentPrimary
            : settingsSurfaceTokens.borderSubtle,
        color: settingsSurfaceTokens.textPrimary,
        boxShadow: isSelected
          ? `0 0 0 1px ${settingsSurfaceTokens.accentPrimary}`
          : undefined,
      }}
      data-skin-preview-card={metadata.id}
    >
      {/* Header: label + recommended marker */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className="truncate text-sm font-semibold tracking-tight"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {metadata.label}
            </h4>
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                borderColor: settingsSurfaceTokens.borderSubtle,
                color: settingsSurfaceTokens.textTertiary,
              }}
            >
              {MOOD_LABELS[metadata.mood]}
            </span>
          </div>
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            {metadata.tagline}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {isSelected && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: settingsSurfaceTokens.accentSoft,
                color: settingsSurfaceTokens.accentPrimary,
              }}
            >
              <Icon
                name="CheckCircle"
                variant="BoldDuotone"
                className="h-3 w-3"
              />
              Current
            </span>
          )}
          {isRecommended && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: settingsSurfaceTokens.accentSoft,
                color: settingsSurfaceTokens.accentPrimary,
              }}
            >
              <Icon name="Star" variant="BoldDuotone" className="h-3 w-3" />
              Recommended
            </span>
          )}
        </div>
      </div>

      {/* Visual sample: an "operating environment sample", not a swatch. */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{
          ...sampleVariables,
          background:
            "var(--luca-background-liquid, var(--luca-background-base))",
          borderColor:
            "color-mix(in srgb, var(--luca-text-primary) 12%, transparent)",
        }}
        aria-hidden="true"
      >
        <div className="flex flex-col gap-2 p-3">
          {/* Sample panel/card with text hierarchy */}
          <div
            className="rounded-lg p-2.5"
            style={{
              backgroundColor: "var(--luca-surface-glass)",
              border:
                "1px solid color-mix(in srgb, var(--luca-text-primary) 10%, transparent)",
              boxShadow: "var(--luca-shadow-soft)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--luca-accent-primary)" }}
              />
              <span
                className="h-1.5 w-16 rounded-full"
                style={{ backgroundColor: "var(--luca-text-primary)" }}
              />
            </div>
            <div
              className="mt-2 h-1.5 w-full rounded-full"
              style={{
                backgroundColor: "var(--luca-text-secondary)",
                opacity: 0.7,
              }}
            />
            <div
              className="mt-1.5 h-1.5 w-2/3 rounded-full"
              style={{
                backgroundColor: "var(--luca-text-tertiary)",
                opacity: 0.7,
              }}
            />
          </div>

          {/* Composer-like strip */}
          <div
            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
            style={{
              backgroundColor: "var(--luca-surface-solid)",
              border:
                "1px solid color-mix(in srgb, var(--luca-text-primary) 8%, transparent)",
            }}
          >
            <span
              className="h-1.5 w-20 rounded-full"
              style={{
                backgroundColor: "var(--luca-text-tertiary)",
                opacity: 0.6,
              }}
            />
            <span
              className="h-5 w-5 rounded-md"
              style={{
                backgroundColor: "var(--luca-accent-primary)",
                opacity: 0.85,
              }}
            />
          </div>

          {/* Accent line */}
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: "var(--luca-accent-primary)" }}
          />
        </div>
      </div>

      {/* Description */}
      <p
        className="text-xs leading-relaxed"
        style={{ color: settingsSurfaceTokens.textSecondary }}
      >
        {metadata.description}
      </p>

      {/* Accessibility / capability indicators */}
      {indicators.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {indicators.map((capability) => (
            <span
              key={capability}
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                borderColor: settingsSurfaceTokens.borderSubtle,
                color: settingsSurfaceTokens.textTertiary,
              }}
            >
              {CAPABILITY_LABELS[capability]}
            </span>
          ))}
        </div>
      )}
    </CardElement>
  );
};

export default SkinPreviewCard;
