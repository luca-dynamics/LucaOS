import React from "react";
import {
  LucaPresence,
  type LucaPresenceState,
} from "../presence/LucaPresence";
import type { LucaSkinHostKind, LucaSkinId } from "../../config/lucaSkins";
import {
  getPremiumOnboardingCopy,
  type PremiumOnboardingAudienceMode,
  type PremiumOnboardingOptionCopy,
  type PremiumOnboardingScreenId,
} from "./onboardingPremiumCopy";
import { getPremiumOnboardingScreenEntry } from "./onboardingPremiumScreenMap";
import { getLucaOnboardingDisclosure } from "./lucaOnboardingDisclosure";
import { LucaSurfaceMockup } from "./LucaSurfaceMockup";

/**
 * LucaOnboardingScreen — one pure, data-driven renderer for every premium
 * onboarding screen (per docs/luca-onboarding-presence-visual-language-spec.md).
 *
 * It reads the already-merged copy (onboardingPremiumCopy) and structure
 * (onboardingPremiumScreenMap) for the given screen id and renders the
 * eyebrow / title / summary / reassurance, an inert radiogroup of option
 * cards, the primary/secondary CTAs, and the per-screen LucaPresence
 * expression. It authors no new copy and infers no new structure.
 *
 * Purity / boundary discipline:
 * - Presentational and inert. Selection is fully controlled
 *   (`selectedOptionId` + `onSelectOption`); the component holds no state.
 * - CTAs and option taps only invoke the provided callbacks — no provider,
 *   memory, tool, governance, routing, microphone, or storage side effects.
 * - It reads the scoped `--luca-*` material variables from an ancestor
 *   LucaOnboardingShell; it does NOT mutate document.documentElement / body /
 *   html, call style.setProperty, or mount a provider.
 * - It carries no status/safety semantics; the per-screen `reassurance` copy
 *   and the merged side-effect boundary stay authoritative.
 *
 * Presence mapping: the hero identity face appears on welcome / finish; the
 * (static, inert) voice orb previews the `presence` screen; every other screen
 * relies on the shell's ambient face only. The orb does not start listening.
 */

export type LucaOnboardingScreenPresence = LucaPresenceState | "none";

const DEFAULT_SCREEN_PRESENCE: Record<
  PremiumOnboardingScreenId,
  LucaOnboardingScreenPresence
> = {
  welcome: "identity",
  environment: "none",
  // The presence screen shows the Luca hologram being (the identity face), not
  // the placeholder voice orb — Luca is one being across the flow.
  presence: "identity",
  permission_style: "none",
  memory_boundaries: "none",
  connect_tools: "none",
  intelligence_route: "none",
  finish: "identity",
};

/** The presence expression a given onboarding screen shows by default. */
export const getLucaOnboardingScreenPresence = (
  screenId: PremiumOnboardingScreenId,
): LucaOnboardingScreenPresence => DEFAULT_SCREEN_PRESENCE[screenId] ?? "none";

export interface LucaOnboardingScreenProps {
  screenId: PremiumOnboardingScreenId;
  /** Which copy tier to render (Basic for now). */
  audienceMode?: PremiumOnboardingAudienceMode;
  /** Controlled current option selection (radiogroup screens only). */
  selectedOptionId?: string;
  /** Notified when the user picks an option. No side effects are performed. */
  onSelectOption?: (optionId: string) => void;
  /** Primary CTA handler (e.g. Start / Continue / Enter LucaOS). */
  onPrimary?: () => void;
  /** Secondary CTA handler (e.g. Skip / Use recommended / Review choices). */
  onSecondary?: () => void;
  /** Override the per-screen presence expression. */
  presenceState?: LucaOnboardingScreenPresence;
  /** Optional controlled display-name value (rendered on the welcome screen). */
  nameValue?: string;
  /** When provided on the welcome screen, renders an optional name field. */
  onNameChange?: (name: string) => void;
  // Presence resolution (forwarded to LucaPresence; usually inherited from shell).
  skinId?: LucaSkinId | string;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  faceSrc?: string;
  className?: string;
  style?: React.CSSProperties;
}

const textPrimary = "var(--luca-text-primary)";
const textSecondary = "var(--luca-text-secondary)";
const textTertiary = "var(--luca-text-tertiary)";
const accent = "var(--luca-accent-primary)";

function OptionCard({
  option,
  checked,
  onSelect,
}: {
  option: PremiumOnboardingOptionCopy;
  checked: boolean;
  onSelect?: (optionId: string) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-luca-onboarding-option={option.id}
      onClick={onSelect ? () => onSelect(option.id) : undefined}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: onSelect ? "pointer" : "default",
        padding: "14px 16px",
        borderRadius: 14,
        border: `1px solid ${
          checked ? accent : "var(--luca-surface-hover)"
        }`,
        background: checked
          ? "var(--luca-surface-hover)"
          : "var(--luca-surface-glass)",
        color: textPrimary,
        boxShadow: checked ? "var(--luca-shadow-soft)" : "none",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        {option.title}
        {option.recommended && (
          <span
            data-luca-onboarding-chip="recommended"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "2px 8px",
              borderRadius: 999,
              color: accent,
              border: `1px solid ${accent}`,
            }}
          >
            Recommended
          </span>
        )}
        {option.advanced && (
          <span
            data-luca-onboarding-chip="advanced"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "2px 8px",
              borderRadius: 999,
              color: textTertiary,
              border: "1px solid var(--luca-surface-hover)",
            }}
          >
            Advanced
          </span>
        )}
      </span>
      <span
        style={{
          display: "block",
          marginTop: 4,
          fontSize: 13,
          lineHeight: 1.45,
          color: textSecondary,
        }}
      >
        {option.description}
      </span>
    </button>
  );
}

/**
 * SurfaceMockupTile — a Claude-style option tile that leads with a small CSS
 * mockup of the surface, used by the presence ("Choose how Luca appears")
 * screen so all surfaces are showcased in a compact grid that fits one screen.
 * Keeps radio semantics + the data-luca-onboarding-option hook.
 */
function SurfaceMockupTile({
  option,
  checked,
  onSelect,
}: {
  option: PremiumOnboardingOptionCopy;
  checked: boolean;
  onSelect?: (optionId: string) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-luca-onboarding-option={option.id}
      onClick={onSelect ? () => onSelect(option.id) : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "left",
        cursor: onSelect ? "pointer" : "default",
        padding: 10,
        borderRadius: 14,
        border: `1px solid ${checked ? accent : "var(--luca-surface-hover)"}`,
        background: checked ? "var(--luca-surface-hover)" : "var(--luca-surface-glass)",
        color: textPrimary,
        boxShadow: checked ? "var(--luca-shadow-soft)" : "none",
      }}
    >
      <LucaSurfaceMockup surfaceId={option.id} />
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
        {option.title}
        {option.recommended && (
          <span
            data-luca-onboarding-chip="recommended"
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 999,
              color: accent,
              border: `1px solid ${accent}`,
            }}
          >
            Recommended
          </span>
        )}
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.4, color: textSecondary }}>
        {option.description}
      </span>
    </button>
  );
}

export const LucaOnboardingScreen: React.FC<LucaOnboardingScreenProps> = ({
  screenId,
  audienceMode = "basic",
  selectedOptionId,
  onSelectOption,
  onPrimary,
  onSecondary,
  presenceState,
  nameValue,
  onNameChange,
  skinId,
  hostKind,
  reducedMotion,
  reducedTransparency,
  faceSrc,
  className,
  style,
}) => {
  const copy = getPremiumOnboardingCopy(audienceMode).screens[screenId];
  const entry = getPremiumOnboardingScreenEntry(screenId);
  const presence = presenceState ?? getLucaOnboardingScreenPresence(screenId);
  const activeOptionId = selectedOptionId ?? entry.defaultOptionId;
  const { primaryOptions, advancedOptions, advancedShownByDefault } =
    getLucaOnboardingDisclosure(audienceMode, copy.options);

  const presenceProps = {
    skinId,
    hostKind,
    reducedMotion,
    reducedTransparency,
    faceSrc,
  } as const;

  const heroPresence =
    presence === "identity" ? (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <LucaPresence state="identity" label="Luca" {...presenceProps} />
      </div>
    ) : presence === "voice" ? (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <LucaPresence state="voice" size={96} label="Luca voice" {...presenceProps} />
      </div>
    ) : null;

  return (
    <section
      data-luca-onboarding-screen={screenId}
      data-luca-onboarding-category={entry.category}
      aria-label={copy.accessibilityLabel ?? copy.title}
      className={className}
      style={{
        maxWidth: 560,
        margin: "0 auto",
        color: textPrimary,
        ...style,
      }}
    >
      {heroPresence}

      {copy.eyebrow && (
        <p
          data-luca-onboarding-eyebrow
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: textTertiary,
          }}
        >
          {copy.eyebrow}
        </p>
      )}

      <h2
        style={{
          margin: copy.eyebrow ? "6px 0 0" : 0,
          fontSize: 26,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          fontWeight: 650,
        }}
      >
        {copy.title}
      </h2>

      <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.5, color: textSecondary }}>
        {copy.summary}
      </p>

      {copy.reassurance && (
        <p
          role="note"
          data-luca-onboarding-reassurance
          style={{
            margin: "12px 0 0",
            fontSize: 13,
            lineHeight: 1.5,
            color: textTertiary,
          }}
        >
          {copy.reassurance}
        </p>
      )}

      {screenId === "welcome" && onNameChange && (
        <label
          data-luca-onboarding-name
          style={{ display: "block", margin: "18px 0 0", textAlign: "left" }}
        >
          <span
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: textSecondary,
              marginBottom: 6,
            }}
          >
            What should Luca call you? (optional)
          </span>
          <input
            type="text"
            value={nameValue ?? ""}
            onChange={(event) => onNameChange(event.target.value)}
            autoComplete="off"
            placeholder="Your name"
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 12,
              border: "1px solid var(--luca-surface-hover)",
              background: "var(--luca-surface-glass)",
              color: textPrimary,
              fontSize: 15,
            }}
          />
        </label>
      )}

      {copy.options && copy.options.length > 0 && screenId === "presence" ? (
        // "Choose how Luca appears": showcase every surface as a compact
        // mockup tile in a responsive grid that fits one screen (no scroll, no
        // progressive disclosure). Radio semantics + option hooks are kept.
        <div
          role={entry.accessibilityRole === "radiogroup" ? "radiogroup" : "group"}
          aria-label={copy.detailsLabel ?? copy.title}
          data-luca-onboarding-options
          data-luca-onboarding-options-layout="surface-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            margin: "18px 0 0",
          }}
        >
          {[...primaryOptions, ...advancedOptions].map((option) => (
            <SurfaceMockupTile
              key={option.id}
              option={option}
              checked={option.id === activeOptionId}
              onSelect={onSelectOption}
            />
          ))}
        </div>
      ) : copy.options && copy.options.length > 0 ? (
        <div
          role={entry.accessibilityRole === "radiogroup" ? "radiogroup" : "group"}
          aria-label={copy.detailsLabel ?? copy.title}
          data-luca-onboarding-options
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            margin: "20px 0 0",
          }}
        >
          {primaryOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              checked={option.id === activeOptionId}
              onSelect={onSelectOption}
            />
          ))}

          {/* Progressive disclosure: Basic collapses advanced options behind a
              native, stateless disclosure; Pro / Creator show them inline. The
              advanced radio cards stay inside the radiogroup either way. */}
          {advancedOptions.length > 0 &&
            (advancedShownByDefault ? (
              advancedOptions.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  checked={option.id === activeOptionId}
                  onSelect={onSelectOption}
                />
              ))
            ) : (
              <details data-luca-onboarding-advanced>
                <summary
                  data-luca-onboarding-advanced-toggle
                  style={{
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: textSecondary,
                    padding: "4px 2px",
                  }}
                >
                  Advanced options
                </summary>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  {advancedOptions.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      checked={option.id === activeOptionId}
                      onSelect={onSelectOption}
                    />
                  ))}
                </div>
              </details>
            ))}
        </div>
      ) : null}

      <div
        data-luca-onboarding-actions
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "26px 0 0",
        }}
      >
        <button
          type="button"
          data-luca-onboarding-cta="primary"
          onClick={onPrimary}
          style={{
            cursor: onPrimary ? "pointer" : "default",
            padding: "11px 22px",
            borderRadius: 12,
            border: "none",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--luca-background-base)",
            background: accent,
            boxShadow: "var(--luca-shadow-soft)",
          }}
        >
          {copy.primaryCta}
        </button>
        {copy.secondaryCta && (
          <button
            type="button"
            data-luca-onboarding-cta="secondary"
            onClick={onSecondary}
            style={{
              cursor: onSecondary ? "pointer" : "default",
              padding: "11px 18px",
              borderRadius: 12,
              border: "1px solid var(--luca-surface-hover)",
              fontSize: 15,
              fontWeight: 500,
              color: textSecondary,
              background: "transparent",
            }}
          >
            {copy.secondaryCta}
          </button>
        )}
      </div>
    </section>
  );
};

export default LucaOnboardingScreen;
