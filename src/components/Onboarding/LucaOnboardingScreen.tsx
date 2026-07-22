import React from "react";
import { type LucaPresenceState } from "../presence/LucaPresence";
import {
  LUCA_SKINS,
  type LucaSkinHostKind,
  type LucaSkinId,
} from "../../config/lucaSkins";
import {
  getPremiumOnboardingCopy,
  type PremiumOnboardingAudienceMode,
  type PremiumOnboardingOptionCopy,
  type PremiumOnboardingScreenId,
} from "./onboardingPremiumCopy";
import { getPremiumOnboardingScreenEntry } from "./onboardingPremiumScreenMap";
import { getLucaOnboardingDisclosure } from "./lucaOnboardingDisclosure";
import { LucaSurfaceMockup } from "./LucaSurfaceMockup";
import { Icon } from "../ui/Icon";
import {
  useOnboardingConnectors,
  type ConnectorCatalogEntry,
} from "./onboardingConnectors";
import {
  lucaMaterialCardStyle,
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
} from "../../styles/lucaMaterialSystem";

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
  // Incarnation rhythm (docs/mockups/onboarding-target.html): the being is
  // present on EVERY screen — hero at first light, a small mark while you
  // choose, large and warm when it's glad. Never absent, never static.
  welcome: "identity",
  environment: "identity",
  presence: "identity",
  permission_style: "identity",
  memory_boundaries: "identity",
  connect_tools: "identity",
  intelligence_route: "identity",
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
  /**
   * Hover preview (environment screen): report the option under the pointer
   * (null on leave) so the host can re-skin the whole surface live.
   */
  onPreviewOption?: (optionId: string | null) => void;
  /** Primary CTA handler (e.g. Start / Continue / Enter LucaOS). */
  onPrimary?: () => void;
  /** Secondary CTA handler (e.g. Skip / Use recommended / Review choices). */
  onSecondary?: () => void;
  /** Override the per-screen presence expression. */
  presenceState?: LucaOnboardingScreenPresence;
  /** Optional controlled display-name value (rendered on the welcome screen). */
  nameValue?: string;
  /** Material feel on the environment screen: opacity 0..1, blur px. */
  materialValue?: { opacity: number; blur: number };
  onMaterialChange?: (material: { opacity?: number; blur?: number }) => void;
  /** When provided on the welcome screen, renders an optional name field. */
  onNameChange?: (name: string) => void;
  /**
   * Notified (connect_tools screen) when the set of selected tool connectors
   * changes. Intent only — no side effects are performed here.
   */
  onConnectorSelectionsChange?: (connectorIds: string[]) => void;
  /**
   * When true (a desktop host / backend is available), connector tiles launch
   * the real connect flow via `onConnectorConnect` instead of marking intent.
   */
  canConnectTools?: boolean;
  /** Handler that performs the real connect side effect (OAuth / LucaLink). */
  onConnectorConnect?: (connector: ConnectorCatalogEntry) => void;
  // Presence resolution (forwarded to LucaPresence; usually inherited from shell).
  skinId?: LucaSkinId | string;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  faceSrc?: string;
  /** 0-based step index + total, shown as the welcome "Onboarding · N of M" pill. */
  stepIndex?: number;
  stepTotal?: number;
  /** Welcome "What is LucaOS?" affordance. Inert (opens nothing) when omitted. */
  onLearnMore?: () => void;
  /** Back affordance for bespoke hero screens that hide the shared header. */
  canGoBack?: boolean;
  onBack?: () => void;
  /**
   * Presence screen: which startup surfaces are "Active now" (multi-enable).
   * Controlled; toggling a row reports the full next set. Preference only.
   */
  startupSurfaceSelections?: readonly string[];
  onStartupSurfacesChange?: (surfaceIds: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

const textSecondary = "var(--luca-text-secondary)";
const textTertiary = "var(--luca-text-tertiary)";
const accent = "var(--luca-accent-primary)";
const LUCA_BRAND_DISPLAY_STYLE: React.CSSProperties = {
  fontFamily:
    '"Segoe UI Variable Display", Inter, "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 650,
  letterSpacing: "-0.035em",
};

/**
 * The light "glacier" environment shared with the boot surfaces (boot.html and
 * the frontend loader): a luminous glow behind the face, soft light upper-left,
 * a cool base deepening at the edges. The welcome hero renders on this so the
 * onboarding opens in the same world the boot faded up from.
 */
export const LUCA_ONBOARDING_LIGHT_BACKGROUND =
  "radial-gradient(55% 70% at 72% 42%, rgba(238, 249, 251, 0.92) 0%, rgba(238, 249, 251, 0) 60%), " +
  "radial-gradient(80% 100% at 18% 28%, rgba(243, 250, 252, 0.7) 0%, rgba(243, 250, 252, 0) 55%), " +
  "linear-gradient(160deg, #e2edf2 0%, #d8e4ec 48%, #c9d9e3 100%)";

// Dark-on-light palette for the light hero (independent of the dark-skin
// --luca-* tokens, which assume a dark surface).
const HERO_INK = "#2b303a";
const HERO_INK_2 = "#5b636f";
const HERO_ACCENT = "#3d8fa6";

/**
 * WelcomeHero — the bespoke first onboarding screen (per the founder mockup):
 * a two-column hero on the boot's light glacier. Left: an "Onboarding · N of M"
 * pill, a two-line "Welcome to / LucaOS." wordmark, the subtitle, a glass
 * "Get started" CTA, and a quiet "What is LucaOS?" link. Right: the hologram
 * face, large, bleeding off the edge and dissolving into the misty base.
 *
 * It is inert and controlled: the CTA calls `onPrimary`, the link calls
 * `onLearnMore` (nothing when omitted). It authors no flow or side effects.
 */
function WelcomeHero({
  title,
  summary,
  stepIndex,
  stepTotal,
  onPrimary,
  onLearnMore,
  faceSrc = "/hologram.png",
  reducedMotion,
  className,
  style,
}: {
  title: string;
  summary: string;
  stepIndex?: number;
  stepTotal?: number;
  onPrimary?: () => void;
  onLearnMore?: () => void;
  faceSrc?: string;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const total = stepTotal ?? 0;
  const step = (stepIndex ?? 0) + 1;
  // Split the wordmark off the lead ("Welcome to LucaOS" -> "Welcome to" +
  // accented "LucaOS.") without hard-coding the lead words.
  const brand = "LucaOS";
  const lead = title.includes(brand) ? title.replace(brand, "").trim() : title;

  return (
    <section
      data-luca-onboarding-screen="welcome"
      data-luca-onboarding-category="intro"
      aria-label={title}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
        overflow: "hidden",
        background: LUCA_ONBOARDING_LIGHT_BACKGROUND,
        color: HERO_INK,
        ...style,
      }}
    >
      {/* Face: large, center-right, bleeding off the edge; the boot high-key
          treatment plus a bottom fade so the shoulders dissolve into the mist. */}
      <img
        src={faceSrc}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "clamp(-80px, -4vw, -20px)",
          top: "50%",
          transform: "translateY(-50%)",
          height: "min(96vh, 760px)",
          width: "auto",
          maxWidth: "58%",
          objectFit: "contain",
          opacity: 0.96,
          filter:
            "brightness(1.06) saturate(0.86) contrast(0.98) drop-shadow(0 18px 60px rgba(150, 185, 215, 0.32))",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 60%, rgba(0, 0, 0, 0.5) 82%, transparent 98%)",
          maskImage:
            "linear-gradient(to bottom, black 60%, rgba(0, 0, 0, 0.5) 82%, transparent 98%)",
          animation: reducedMotion
            ? undefined
            : "luca-hologram-breathe 6.4s ease-in-out infinite",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* Left column: pill, wordmark, subtitle, CTA, learn-more. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          minHeight: "inherit",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 0,
          maxWidth: "min(52%, 560px)",
          paddingLeft: "clamp(8px, 3vw, 40px)",
        }}
      >
        <span
          data-luca-onboarding-preview-progress
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12.5,
            letterSpacing: "0.01em",
            color: HERO_INK_2,
            background: "rgba(255, 255, 255, 0.5)",
            border: "1px solid rgba(43, 48, 58, 0.1)",
            WebkitBackdropFilter: "blur(8px)",
            backdropFilter: "blur(8px)",
          }}
        >
          Onboarding{total ? ` · ${step} of ${total}` : ""}
        </span>

        <h1
          style={{
            ...LUCA_BRAND_DISPLAY_STYLE,
            margin: "22px 0 0",
            fontSize: "clamp(30px, 4.2vw, 50px)",
            lineHeight: 1.06,
            fontWeight: 600,
            color: HERO_INK,
            // One straight line — never broken into "Welcome to" / "LucaOS."
            whiteSpace: "nowrap",
          }}
        >
          {lead} <span style={{ color: HERO_ACCENT }}>{brand}.</span>
        </h1>

        <p
          style={{
            margin: "20px 0 0",
            maxWidth: 360,
            fontSize: 16,
            lineHeight: 1.55,
            color: HERO_INK_2,
          }}
        >
          {summary}
        </p>

        <button
          type="button"
          data-luca-onboarding-cta="primary"
          className="luca-material-pressable"
          onClick={onPrimary}
          style={{
            marginTop: 34,
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            minWidth: 300,
            cursor: onPrimary ? "pointer" : "default",
            padding: "17px 14px 17px 26px",
            borderRadius: 18,
            border: "1px solid rgba(255, 255, 255, 0.55)",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "#ffffff",
            textShadow: "0 1px 1px rgba(52, 92, 148, 0.35)",
            // Liquid-glass fill: a bright top sheen layered over a luminous
            // blue body that deepens toward the base.
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 34%, rgba(255, 255, 255, 0) 55%), " +
              "linear-gradient(150deg, #9cc8ef 0%, #74a4da 50%, #5d8ecb 100%)",
            // Blue bloom below, crisp lit top edge, and inner depth at the base.
            boxShadow:
              "0 20px 44px rgba(96, 140, 202, 0.5), 0 3px 10px rgba(96, 140, 202, 0.28), " +
              "inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -10px 22px rgba(70, 110, 172, 0.3)",
            WebkitBackdropFilter: "blur(8px) saturate(1.3)",
            backdropFilter: "blur(8px) saturate(1.3)",
          }}
        >
          Get started
          {/* Arrow in its own soft glass chip, echoing the mockup. */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 999,
              fontSize: 17,
              lineHeight: 1,
              color: "#ffffff",
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.12) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -3px 8px rgba(70, 110, 172, 0.28)",
            }}
          >
            →
          </span>
        </button>

        <button
          type="button"
          data-luca-onboarding-cta="learn-more"
          onClick={onLearnMore}
          style={{
            marginTop: 20,
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            cursor: onLearnMore ? "pointer" : "default",
            background: "transparent",
            border: "none",
            padding: "4px 2px",
            fontSize: 14,
            color: HERO_INK_2,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: 999,
              border: `1.4px solid ${HERO_INK_2}`,
              fontSize: 12,
              fontStyle: "italic",
              fontWeight: 600,
            }}
          >
            i
          </span>
          What is LucaOS?
        </button>
      </div>
    </section>
  );
}

/**
 * Preview art per appearance mode (Claude-desktop model: one identity, two
 * modes). Light shows Pearl's glacier, Dark shows Carbon's ice-slate, System
 * splits the two down the middle.
 */
const APPEARANCE_MODE_PREVIEWS: Record<string, string> = {
  light: LUCA_SKINS.pearl.backgroundProfile.hero,
  dark: LUCA_SKINS.carbon.backgroundProfile.hero,
  system:
    "linear-gradient(105deg, #e2edf2 0%, #d8e4ec 49.8%, #131c22 50.2%, #0c1216 100%)",
};

/** Whether a mode's preview art is dark (drives the mini-UI overlay tone). */
const APPEARANCE_MODE_DARK_PREVIEW: Record<string, boolean> = {
  light: false,
  dark: true,
  system: false,
};

/**
 * HeroFrame — the shared chrome for the bespoke light onboarding screens
 * (environment, presence, …): glacier background, ← Back, dots progress with
 * the "Onboarding · Step N of M" label, centered title + summary, the screen's
 * own content (cards) as children, then the premium Continue CTA, a quiet
 * secondary action, and an optional footnote.
 */
function HeroFrame({
  screenId,
  category,
  title,
  summary,
  stepIndex,
  stepTotal,
  canBack,
  onBack,
  onPrimary,
  onSecondary,
  primaryCta,
  secondaryCta,
  footnote,
  children,
  className,
  style,
}: {
  screenId: PremiumOnboardingScreenId;
  category: string;
  title: string;
  summary: string;
  stepIndex?: number;
  stepTotal?: number;
  canBack?: boolean;
  onBack?: () => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryCta: string;
  secondaryCta?: string;
  footnote?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const total = stepTotal ?? 0;
  const step = (stepIndex ?? 0) + 1;

  return (
    <section
      data-luca-onboarding-screen={screenId}
      data-luca-onboarding-category={category}
      aria-label={title}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
        overflow: "hidden",
        background: LUCA_ONBOARDING_LIGHT_BACKGROUND,
        color: HERO_INK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 28px 34px",
        ...style,
      }}
    >
      {canBack && (
        <button
          type="button"
          data-luca-onboarding-preview-back
          onClick={onBack}
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            cursor: "pointer",
            background: "transparent",
            border: "none",
            padding: "6px 8px",
            fontSize: 14,
            color: HERO_INK_2,
          }}
        >
          ← Back
        </button>
      )}

      {/* Dots progress + step label. */}
      <div
        aria-hidden="true"
        style={{ display: "flex", alignItems: "center", gap: 7 }}
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            style={{
              width: i === step - 1 ? 9 : 6,
              height: i === step - 1 ? 9 : 6,
              borderRadius: 999,
              background:
                i === step - 1 ? HERO_ACCENT : "rgba(43, 48, 58, 0.18)",
              boxShadow:
                i === step - 1
                  ? "0 0 0 3px rgba(61, 143, 166, 0.18)"
                  : undefined,
            }}
          />
        ))}
      </div>
      <p
        data-luca-onboarding-preview-progress
        style={{
          margin: "12px 0 0",
          fontSize: 12.5,
          letterSpacing: "0.02em",
          color: HERO_INK_2,
        }}
      >
        Onboarding · Step {step} of {total}
      </p>

      <h2
        style={{
          ...LUCA_BRAND_DISPLAY_STYLE,
          margin: "14px 0 0",
          fontSize: "clamp(24px, 2.8vw, 32px)",
          fontWeight: 650,
          color: HERO_INK,
          textAlign: "center",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "10px 0 0",
          maxWidth: 420,
          fontSize: 14,
          lineHeight: 1.55,
          color: HERO_INK_2,
          textAlign: "center",
        }}
      >
        {summary}
      </p>

      {children}

      {/* Continue + secondary. */}
      <button
        type="button"
        data-luca-onboarding-cta="primary"
        className="luca-material-pressable"
        onClick={onPrimary}
        style={{
          marginTop: 30,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minWidth: 210,
          cursor: onPrimary ? "pointer" : "default",
          padding: "13px 26px",
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.55)",
          fontSize: 15,
          fontWeight: 600,
          color: "#ffffff",
          textShadow: "0 1px 1px rgba(52, 92, 148, 0.35)",
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 34%, rgba(255, 255, 255, 0) 55%), " +
            "linear-gradient(150deg, #9cc8ef 0%, #74a4da 50%, #5d8ecb 100%)",
          boxShadow:
            "0 16px 36px rgba(96, 140, 202, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -8px 18px rgba(70, 110, 172, 0.28)",
        }}
      >
        {primaryCta}
        <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
          →
        </span>
      </button>
      {secondaryCta && (
        <button
          type="button"
          data-luca-onboarding-cta="secondary"
          onClick={onSecondary}
          style={{
            marginTop: 14,
            cursor: onSecondary ? "pointer" : "default",
            background: "transparent",
            border: "none",
            padding: "4px 8px",
            fontSize: 13.5,
            fontWeight: 500,
            color: HERO_INK_2,
          }}
        >
          {secondaryCta}
        </button>
      )}

      {footnote && (
        <p
          style={{
            margin: "18px 0 0",
            fontSize: 11.5,
            color: "#8b929d",
          }}
        >
          {footnote}
        </p>
      )}
    </section>
  );
}

/** Shared selected-state check badge for light hero cards. */
function HeroCardCheckBadge(): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: 999,
        background: HERO_ACCENT,
        boxShadow: "0 4px 10px rgba(61, 143, 166, 0.4)",
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.3 4.3L19 7.4" />
      </svg>
    </span>
  );
}

/** Shared card shell style for light hero option cards. */
const heroCardStyle = (checked: boolean): React.CSSProperties => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 0,
  padding: 10,
  textAlign: "center",
  borderRadius: 18,
  border: checked
    ? `1.6px solid ${HERO_ACCENT}`
    : "1px solid rgba(43, 48, 58, 0.1)",
  background: "rgba(255, 255, 255, 0.55)",
  boxShadow: checked
    ? "0 18px 40px rgba(96, 140, 202, 0.24), 0 0 0 4px rgba(61, 143, 166, 0.1)"
    : "0 12px 30px rgba(120, 150, 190, 0.14)",
  WebkitBackdropFilter: "blur(14px) saturate(1.3)",
  backdropFilter: "blur(14px) saturate(1.3)",
  transition: "box-shadow 180ms ease, border-color 180ms ease",
});

/**
 * EnvironmentHero — onboarding screen 2 (founder mockup): "Choose your
 * environment" on the boot's light glacier. Dots progress on top, centered
 * title + summary, a row of four skin cards (mini UI preview, name, mood
 * words, Recommended pill, check badge when selected), then the premium
 * Continue CTA, a quiet "Skip for now", and the Settings footnote.
 *
 * Controlled + inert like every screen: selection/CTAs only call the provided
 * callbacks. The card previews are painted from each skin's own material
 * profile, so no skin is activated during onboarding.
 */
function EnvironmentHero({
  title,
  summary,
  options,
  selectedOptionId,
  onSelectOption,
  onPrimary,
  onSecondary,
  primaryCta,
  secondaryCta,
  stepIndex,
  stepTotal,
  canBack,
  onBack,
  className,
  style,
}: {
  title: string;
  summary: string;
  options: PremiumOnboardingOptionCopy[];
  selectedOptionId?: string;
  onSelectOption?: (optionId: string) => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryCta: string;
  secondaryCta?: string;
  stepIndex?: number;
  stepTotal?: number;
  canBack?: boolean;
  onBack?: () => void;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const cards = options;

  return (
    <HeroFrame
      screenId="environment"
      category="appearance"
      title={title}
      summary={summary}
      stepIndex={stepIndex}
      stepTotal={stepTotal}
      canBack={canBack}
      onBack={onBack}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      primaryCta={primaryCta}
      secondaryCta={secondaryCta}
      footnote="You can customize colors, accents, and more in Settings."
      className={className}
      style={style}
    >
      {/* Appearance-mode cards: Light / Dark / System. */}
      <div
        role="radiogroup"
        aria-label={title}
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          marginTop: 28,
          width: "100%",
          maxWidth: 800,
        }}
      >
        {cards.map((option) => {
          const checked = option.id === selectedOptionId;
          const previewArt =
            APPEARANCE_MODE_PREVIEWS[option.id] ?? "rgba(255,255,255,0.6)";
          const darkPreview = APPEARANCE_MODE_DARK_PREVIEW[option.id] === true;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              data-luca-onboarding-option={option.id}
              data-luca-onboarding-appearance-option={option.id}
              onClick={onSelectOption ? () => onSelectOption(option.id) : undefined}
              style={{
                ...heroCardStyle(checked),
                flex: "1 1 190px",
                maxWidth: 230,
                cursor: onSelectOption ? "pointer" : "default",
              }}
            >
              {checked && <HeroCardCheckBadge />}

              {/* Mini UI preview painted with the mode's glacier. */}
              <span
                aria-hidden="true"
                style={{
                  display: "block",
                  position: "relative",
                  height: 148,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(43, 48, 58, 0.08)",
                  background: previewArt,
                }}
              >
                {/* sidebar */}
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    top: 8,
                    bottom: 8,
                    width: 26,
                    borderRadius: 6,
                    background: darkPreview
                      ? "rgba(255, 255, 255, 0.09)"
                      : "rgba(255, 255, 255, 0.5)",
                  }}
                />
                {/* content rows */}
                {[0, 1, 2].map((row) => (
                  <span
                    key={row}
                    style={{
                      position: "absolute",
                      left: 42,
                      right: 8,
                      top: 10 + row * 34,
                      height: 26,
                      borderRadius: 6,
                      background: darkPreview
                        ? "rgba(255, 255, 255, 0.07)"
                        : "rgba(255, 255, 255, 0.42)",
                    }}
                  />
                ))}
              </span>

              <span
                style={{
                  marginTop: 12,
                  fontSize: 14.5,
                  fontWeight: 650,
                  color: HERO_INK,
                }}
              >
                {option.title}
              </span>
              {option.recommended ? (
                <span
                  data-luca-onboarding-chip="recommended"
                  style={{
                    alignSelf: "center",
                    marginTop: 6,
                    marginBottom: 4,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    color: HERO_ACCENT,
                    background: "rgba(61, 143, 166, 0.1)",
                  }}
                >
                  ★ Recommended
                </span>
              ) : (
                <span
                  style={{
                    marginTop: 6,
                    marginBottom: 4,
                    fontSize: 11.5,
                    color: HERO_INK_2,
                  }}
                >
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>

    </HeroFrame>
  );
}

/** Line icons for the startup-surface rows (presence screen). */
const STARTUP_SURFACE_ICONS: Record<string, React.ReactElement> = {
  minichat: (
    <path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-9L5.5 19.5V16H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
  ),
  voice: <path d="M5 10v4M9 7v10M13 9v6M17 6v12M21 10v4" />,
  widget: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>
  ),
  presence: (
    <>
      <circle cx="12" cy="9" r="3.2" />
      <path d="M6 19c0-3 2.7-4.8 6-4.8s6 1.8 6 4.8" />
    </>
  ),
};

/**
 * PresenceHero — onboarding screen 3 (founder mockup): "Choose how Luca
 * appears." on the welcome-family layout — pill + heading + a LIST of startup
 * surfaces on the left (each row: icon, name, one-liner, and an
 * "Active now / Enable later" toggle), the hologram face on the right, and
 * Set up later + Continue in the lower-right. The dashboard is not listed —
 * everyone lands there after setup.
 *
 * Controlled + inert: toggles report the full next "Active now" set via
 * `onStartupSurfacesChange`; nothing is activated during onboarding.
 */
function PresenceHero({
  title,
  summary,
  options,
  startupSurfaceSelections,
  onStartupSurfacesChange,
  onPrimary,
  onSecondary,
  primaryCta,
  secondaryCta,
  stepIndex,
  stepTotal,
  canBack,
  onBack,
  reassurance,
  faceSrc = "/hologram.png",
  reducedMotion,
  className,
  style,
}: {
  title: string;
  summary: string;
  options: PremiumOnboardingOptionCopy[];
  startupSurfaceSelections?: readonly string[];
  onStartupSurfacesChange?: (surfaceIds: string[]) => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryCta: string;
  secondaryCta?: string;
  stepIndex?: number;
  stepTotal?: number;
  canBack?: boolean;
  onBack?: () => void;
  reassurance?: string;
  faceSrc?: string;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const total = stepTotal ?? 0;
  const step = (stepIndex ?? 0) + 1;
  const activeSurfaces = startupSurfaceSelections ?? [];
  const toggleSurface = (surfaceId: string) => {
    if (!onStartupSurfacesChange) return;
    onStartupSurfacesChange(
      activeSurfaces.includes(surfaceId)
        ? activeSurfaces.filter((id) => id !== surfaceId)
        : [...activeSurfaces, surfaceId],
    );
  };

  return (
    <section
      data-luca-onboarding-screen="presence"
      data-luca-onboarding-category="presence"
      aria-label={title}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
        overflow: "hidden",
        background: LUCA_ONBOARDING_LIGHT_BACKGROUND,
        color: HERO_INK,
        ...style,
      }}
    >
      {/* Face: large, center-right, dissolving into the mist (welcome family). */}
      <img
        src={faceSrc}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "clamp(-70px, -3vw, -14px)",
          top: "50%",
          transform: "translateY(-50%)",
          height: "min(88vh, 700px)",
          width: "auto",
          maxWidth: "50%",
          objectFit: "contain",
          opacity: 0.96,
          filter:
            "brightness(1.06) saturate(0.86) contrast(0.98) drop-shadow(0 18px 60px rgba(150, 185, 215, 0.32))",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 60%, rgba(0, 0, 0, 0.5) 82%, transparent 98%)",
          maskImage:
            "linear-gradient(to bottom, black 60%, rgba(0, 0, 0, 0.5) 82%, transparent 98%)",
          animation: reducedMotion
            ? undefined
            : "luca-hologram-breathe 6.4s ease-in-out infinite",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* Left column: back, pill, heading, summary, surface rows, note. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          minHeight: "inherit",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "min(52%, 560px)",
          padding: "56px 0 72px clamp(14px, 3vw, 44px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            alignSelf: "flex-start",
          }}
        >
          {canBack && (
            <button
              type="button"
              data-luca-onboarding-preview-back
              onClick={onBack}
              style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: "4px 6px",
                fontSize: 13.5,
                color: HERO_INK_2,
              }}
            >
              ← Back
            </button>
          )}
          <span
            data-luca-onboarding-preview-progress
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 13px",
              borderRadius: 999,
              fontSize: 12,
              letterSpacing: "0.01em",
              color: HERO_INK_2,
              background: "rgba(255, 255, 255, 0.5)",
              border: "1px solid rgba(43, 48, 58, 0.1)",
              WebkitBackdropFilter: "blur(8px)",
              backdropFilter: "blur(8px)",
            }}
          >
            Onboarding{total ? ` · ${step} of ${total}` : ""}
          </span>
        </div>

        <h2
          style={{
            ...LUCA_BRAND_DISPLAY_STYLE,
            margin: "16px 0 0",
            fontSize: "clamp(24px, 2.9vw, 34px)",
            fontWeight: 650,
            lineHeight: 1.1,
            color: HERO_INK,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            lineHeight: 1.55,
            color: HERO_INK_2,
          }}
        >
          {summary}
        </p>

        {/* Startup-surface rows. */}
        <div
          data-luca-onboarding-options
          data-luca-onboarding-options-layout="startup-list"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            marginTop: 22,
          }}
        >
          {options.map((option) => {
            const isActive = activeSurfaces.includes(option.id);
            return (
              <div
                key={option.id}
                data-luca-startup-surface={option.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 13px",
                  borderRadius: 15,
                  background: "rgba(255, 255, 255, 0.55)",
                  border: "1px solid rgba(43, 48, 58, 0.09)",
                  boxShadow: "0 10px 26px rgba(120, 150, 190, 0.12)",
                  WebkitBackdropFilter: "blur(12px) saturate(1.25)",
                  backdropFilter: "blur(12px) saturate(1.25)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    color: "#4e7fae",
                    background: "rgba(109, 158, 209, 0.14)",
                  }}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {STARTUP_SURFACE_ICONS[option.id] ?? (
                      <circle cx="12" cy="12" r="8" />
                    )}
                  </svg>
                </span>

                <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13.5,
                      fontWeight: 650,
                      color: HERO_INK,
                    }}
                  >
                    {option.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 1,
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: HERO_INK_2,
                    }}
                  >
                    {option.description}
                  </span>
                </span>

                {/* Active now / Enable later toggle. */}
                <button
                  type="button"
                  data-luca-onboarding-option={option.id}
                  data-luca-startup-state={isActive ? "active" : "later"}
                  aria-pressed={isActive}
                  onClick={() => toggleSurface(option.id)}
                  style={{
                    flex: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 11px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: onStartupSurfacesChange ? "pointer" : "default",
                    color: isActive ? "#2e7d54" : "#6b7480",
                    background: isActive
                      ? "rgba(87, 181, 131, 0.13)"
                      : "rgba(255, 255, 255, 0.65)",
                    border: isActive
                      ? "1px solid rgba(87, 181, 131, 0.4)"
                      : "1px solid rgba(43, 48, 58, 0.13)",
                    transition:
                      "color 160ms ease, background 160ms ease, border-color 160ms ease",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: isActive ? "#4bb07a" : "#a3a9b2",
                      boxShadow: isActive
                        ? "0 0 0 3px rgba(75, 176, 122, 0.18)"
                        : undefined,
                    }}
                  />
                  {isActive ? "Active now" : "Enable later"}
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.55 }}
                  >
                    <path d="M6 9.5l6 6 6-6" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {reassurance && (
          <span
            role="note"
            data-luca-onboarding-reassurance
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 11.5,
              color: HERO_INK_2,
              background: "rgba(255, 255, 255, 0.5)",
              border: "1px solid rgba(43, 48, 58, 0.09)",
              WebkitBackdropFilter: "blur(8px)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 15,
                height: 15,
                borderRadius: 999,
                border: `1.2px solid ${HERO_INK_2}`,
                fontSize: 9.5,
                fontStyle: "italic",
                fontWeight: 600,
              }}
            >
              i
            </span>
            {reassurance}
          </span>
        )}
      </div>

      {/* Lower-right actions: quiet secondary + premium Continue. */}
      <div
        style={{
          position: "absolute",
          right: 26,
          bottom: 24,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {secondaryCta && (
          <button
            type="button"
            data-luca-onboarding-cta="secondary"
            onClick={onSecondary}
            style={{
              cursor: onSecondary ? "pointer" : "default",
              padding: "11px 18px",
              borderRadius: 13,
              fontSize: 13.5,
              fontWeight: 550,
              color: HERO_INK_2,
              background: "rgba(255, 255, 255, 0.6)",
              border: "1px solid rgba(43, 48, 58, 0.12)",
              WebkitBackdropFilter: "blur(10px)",
              backdropFilter: "blur(10px)",
            }}
          >
            {secondaryCta}
          </button>
        )}
        <button
          type="button"
          data-luca-onboarding-cta="primary"
          className="luca-material-pressable"
          onClick={onPrimary}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            cursor: onPrimary ? "pointer" : "default",
            padding: "12px 22px",
            borderRadius: 13,
            border: "1px solid rgba(255, 255, 255, 0.55)",
            fontSize: 14,
            fontWeight: 600,
            color: "#ffffff",
            textShadow: "0 1px 1px rgba(52, 92, 148, 0.35)",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 34%, rgba(255, 255, 255, 0) 55%), " +
              "linear-gradient(150deg, #9cc8ef 0%, #74a4da 50%, #5d8ecb 100%)",
            boxShadow:
              "0 14px 32px rgba(96, 140, 202, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -8px 18px rgba(70, 110, 172, 0.28)",
          }}
        >
          {primaryCta}
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>
            →
          </span>
        </button>
      </div>
    </section>
  );
}

/**
 * ChoiceRow — one selectable option row for the centered choice screens
 * (permission_style, memory_boundaries, intelligence_route, connect_tools):
 * title + Recommended/Advanced chips + description on the left, a teal radio
 * indicator on the right. Controlled + inert.
 */
function ChoiceRow({
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
        ...heroCardStyle(checked),
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "12px 15px",
        borderRadius: 15,
        textAlign: "left",
        cursor: onSelect ? "pointer" : "default",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 13.5,
            fontWeight: 650,
            color: HERO_INK,
          }}
        >
          {option.title}
          {option.recommended && (
            <span
              data-luca-onboarding-chip="recommended"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 9px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 600,
                color: HERO_ACCENT,
                background: "rgba(61, 143, 166, 0.1)",
              }}
            >
              ★ Recommended
            </span>
          )}
          {option.advanced && (
            <span
              data-luca-onboarding-chip="advanced"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 9px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 600,
                color: "#6b7480",
                background: "rgba(43, 48, 58, 0.06)",
              }}
            >
              Advanced
            </span>
          )}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 3,
            fontSize: 12,
            lineHeight: 1.45,
            color: HERO_INK_2,
          }}
        >
          {option.description}
        </span>
      </span>

      {/* Radio indicator. */}
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 21,
          height: 21,
          borderRadius: 999,
          background: checked ? HERO_ACCENT : "rgba(255, 255, 255, 0.65)",
          border: checked ? "none" : "1.6px solid rgba(43, 48, 58, 0.22)",
          boxShadow: checked
            ? "0 4px 10px rgba(61, 143, 166, 0.35)"
            : undefined,
          transition: "background 160ms ease, border-color 160ms ease",
        }}
      >
        {checked && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.3 4.3L19 7.4" />
          </svg>
        )}
      </span>
    </button>
  );
}

/**
 * ChoiceHero — the centered light layout for the text-led choice screens:
 * HeroFrame chrome (dots, title, summary, Continue, secondary, footnote)
 * around a single-column radiogroup of ChoiceRows, with Basic-tier advanced
 * options collapsed behind the same native disclosure contract as before
 * (data-luca-onboarding-advanced / -toggle).
 */
function ChoiceHero({
  screenId,
  category,
  title,
  summary,
  options,
  advancedOptions,
  advancedShownByDefault,
  selectedOptionId,
  onSelectOption,
  onPrimary,
  onSecondary,
  primaryCta,
  secondaryCta,
  stepIndex,
  stepTotal,
  canBack,
  onBack,
  footnote,
  children,
  className,
  style,
}: {
  screenId: PremiumOnboardingScreenId;
  category: string;
  title: string;
  summary: string;
  options: PremiumOnboardingOptionCopy[];
  advancedOptions: PremiumOnboardingOptionCopy[];
  advancedShownByDefault: boolean;
  selectedOptionId?: string;
  onSelectOption?: (optionId: string) => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryCta: string;
  secondaryCta?: string;
  stepIndex?: number;
  stepTotal?: number;
  canBack?: boolean;
  onBack?: () => void;
  footnote?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  return (
    <HeroFrame
      screenId={screenId}
      category={category}
      title={title}
      summary={summary}
      stepIndex={stepIndex}
      stepTotal={stepTotal}
      canBack={canBack}
      onBack={onBack}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      primaryCta={primaryCta}
      secondaryCta={secondaryCta}
      footnote={footnote}
      className={className}
      style={style}
    >
      <div
        role="radiogroup"
        aria-label={title}
        data-luca-onboarding-options
        data-luca-onboarding-options-layout="choice-list"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 24,
          width: "100%",
          maxWidth: 560,
        }}
      >
        {options.map((option) => (
          <ChoiceRow
            key={option.id}
            option={option}
            checked={option.id === selectedOptionId}
            onSelect={onSelectOption}
          />
        ))}
        {advancedOptions.length > 0 &&
          (advancedShownByDefault ? (
            advancedOptions.map((option) => (
              <ChoiceRow
                key={option.id}
                option={option}
                checked={option.id === selectedOptionId}
                onSelect={onSelectOption}
              />
            ))
          ) : (
            <details data-luca-onboarding-advanced style={{ textAlign: "left" }}>
              <summary
                data-luca-onboarding-advanced-toggle
                style={{
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: HERO_INK_2,
                  padding: "2px 4px",
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
                  <ChoiceRow
                    key={option.id}
                    option={option}
                    checked={option.id === selectedOptionId}
                    onSelect={onSelectOption}
                  />
                ))}
              </div>
            </details>
          ))}
      </div>
      {children}
    </HeroFrame>
  );
}

/**
 * FinishHero — the completion screen (welcome family): the hologram face on
 * the right, the ready copy on the left, and the premium Enter LucaOS action
 * with a quiet Review choices beside it.
 */
function FinishHero({
  title,
  summary,
  accessibilityLabel,
  onPrimary,
  onSecondary,
  primaryCta,
  secondaryCta,
  stepIndex,
  stepTotal,
  canBack,
  onBack,
  faceSrc = "/hologram.png",
  reducedMotion,
  className,
  style,
}: {
  title: string;
  summary: string;
  accessibilityLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryCta: string;
  secondaryCta?: string;
  stepIndex?: number;
  stepTotal?: number;
  canBack?: boolean;
  onBack?: () => void;
  faceSrc?: string;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const total = stepTotal ?? 0;
  const step = (stepIndex ?? 0) + 1;

  return (
    <section
      data-luca-onboarding-screen="finish"
      data-luca-onboarding-category="finish"
      aria-label={accessibilityLabel ?? title}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
        overflow: "hidden",
        background: LUCA_ONBOARDING_LIGHT_BACKGROUND,
        color: HERO_INK,
        ...style,
      }}
    >
      {/* Face: at its largest and warmest — the being is glad to be here. */}
      <img
        src={faceSrc}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "clamp(-80px, -4vw, -20px)",
          top: "50%",
          transform: "translateY(-50%)",
          height: "min(96vh, 760px)",
          width: "auto",
          maxWidth: "56%",
          objectFit: "contain",
          opacity: 0.96,
          filter:
            "brightness(1.08) saturate(0.9) contrast(0.98) drop-shadow(0 18px 64px rgba(150, 195, 220, 0.4))",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 60%, rgba(0, 0, 0, 0.5) 82%, transparent 98%)",
          maskImage:
            "linear-gradient(to bottom, black 60%, rgba(0, 0, 0, 0.5) 82%, transparent 98%)",
          animation: reducedMotion
            ? undefined
            : "luca-hologram-breathe 6.4s ease-in-out infinite",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* Left column: back + pill, ready copy, actions. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          minHeight: "inherit",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "min(50%, 540px)",
          padding: "56px 0 64px clamp(14px, 3vw, 44px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            alignSelf: "flex-start",
          }}
        >
          {canBack && (
            <button
              type="button"
              data-luca-onboarding-preview-back
              onClick={onBack}
              style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: "4px 6px",
                fontSize: 13.5,
                color: HERO_INK_2,
              }}
            >
              ← Back
            </button>
          )}
          <span
            data-luca-onboarding-preview-progress
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 13px",
              borderRadius: 999,
              fontSize: 12,
              letterSpacing: "0.01em",
              color: HERO_INK_2,
              background: "rgba(255, 255, 255, 0.5)",
              border: "1px solid rgba(43, 48, 58, 0.1)",
              WebkitBackdropFilter: "blur(8px)",
              backdropFilter: "blur(8px)",
            }}
          >
            Onboarding{total ? ` · ${step} of ${total}` : ""}
          </span>
        </div>

        <h1
          style={{
            ...LUCA_BRAND_DISPLAY_STYLE,
            margin: "20px 0 0",
            fontSize: "clamp(34px, 4.6vw, 52px)",
            lineHeight: 1.05,
            fontWeight: 600,
            color: HERO_INK,
          }}
        >
          {title}
          <span style={{ color: HERO_ACCENT }}>.</span>
        </h1>
        <p
          style={{
            margin: "16px 0 0",
            maxWidth: 380,
            fontSize: 15.5,
            lineHeight: 1.55,
            color: HERO_INK_2,
          }}
        >
          {summary}
        </p>

        <button
          type="button"
          data-luca-onboarding-cta="primary"
          className="luca-material-pressable"
          onClick={onPrimary}
          style={{
            marginTop: 32,
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            minWidth: 300,
            cursor: onPrimary ? "pointer" : "default",
            padding: "17px 14px 17px 26px",
            borderRadius: 18,
            border: "1px solid rgba(255, 255, 255, 0.55)",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "#ffffff",
            textShadow: "0 1px 1px rgba(52, 92, 148, 0.35)",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 34%, rgba(255, 255, 255, 0) 55%), " +
              "linear-gradient(150deg, #9cc8ef 0%, #74a4da 50%, #5d8ecb 100%)",
            boxShadow:
              "0 20px 44px rgba(96, 140, 202, 0.5), 0 3px 10px rgba(96, 140, 202, 0.28), " +
              "inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -10px 22px rgba(70, 110, 172, 0.3)",
            WebkitBackdropFilter: "blur(8px) saturate(1.3)",
            backdropFilter: "blur(8px) saturate(1.3)",
          }}
        >
          {primaryCta}
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 999,
              fontSize: 17,
              lineHeight: 1,
              color: "#ffffff",
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.12) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -3px 8px rgba(70, 110, 172, 0.28)",
            }}
          >
            →
          </span>
        </button>

        {secondaryCta && (
          <button
            type="button"
            data-luca-onboarding-cta="secondary"
            onClick={onSecondary}
            style={{
              marginTop: 16,
              alignSelf: "flex-start",
              cursor: onSecondary ? "pointer" : "default",
              background: "transparent",
              border: "none",
              padding: "4px 2px",
              fontSize: 14,
              fontWeight: 500,
              color: HERO_INK_2,
            }}
          >
            {secondaryCta}
          </button>
        )}
      </div>
    </section>
  );
}


/**
 * ConnectorTile — one compact, selectable tool-app card for the "Connect now"
 * path. The whole tile is a toggle: brand badge + name + one-line description,
 * with a check indicator when selected. Selecting is inert/honest — it only
 * marks the tool for setup; no OAuth, token, or tool access is granted during
 * onboarding (per the screen's reassurance copy). Tiles flow in a responsive
 * grid that packs as many per row as the width allows.
 */
function ConnectorTile({
  connector,
  selected,
  onToggle,
  canConnect,
  onConnect,
}: {
  connector: ConnectorCatalogEntry;
  selected: boolean;
  onToggle: (id: string) => void;
  /** When true, the tile launches the real connect flow instead of marking intent. */
  canConnect?: boolean;
  onConnect?: (connector: ConnectorCatalogEntry) => void;
}): React.ReactElement {
  const iconSrc = connector.logo ?? connector.iconUrl;
  const [launching, setLaunching] = React.useState(false);
  const connectMode = Boolean(canConnect && onConnect);
  // In connect mode the tile launches auth; in select mode it toggles intent.
  const highlight = connectMode ? launching : selected;

  const handleClick = () => {
    if (connectMode) {
      onConnect?.(connector);
      setLaunching(true);
      window.setTimeout(() => setLaunching(false), 4000);
    } else {
      onToggle(connector.id);
    }
  };

  return (
    <button
      type="button"
      {...(connectMode
        ? {}
        : { role: "checkbox" as const, "aria-checked": selected })}
      aria-label={connectMode ? `Connect ${connector.name}` : connector.name}
      data-luca-onboarding-connector={connector.id}
      data-luca-connector-mode={connectMode ? "connect" : "select"}
      data-luca-connector-selected={selected ? "true" : "false"}
      data-luca-material-role={highlight ? "control-active" : "card"}
      className="luca-shell-control"
      onClick={handleClick}
      style={{
        ...(highlight ? lucaMaterialControlActiveStyle : lucaMaterialCardStyle),
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        padding: "14px 16px",
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: "solid",
        ...(highlight ? { borderColor: accent } : {}),
        boxShadow: highlight ? "var(--luca-shadow-soft)" : "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          ...(iconSrc
            ? { background: "#ffffff", padding: 6 }
            : {
                background: connector.color,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
              }),
        }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          connector.monogram
        )}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>
          {connector.name}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: 12.5,
            lineHeight: 1.4,
            color: textSecondary,
          }}
        >
          {connector.desc}
        </span>
      </span>
      {connectMode ? (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 600,
            color: accent,
            border: `1px solid ${accent}`,
            whiteSpace: "nowrap",
          }}
        >
          {launching ? "Opening…" : "Connect"}
        </span>
      ) : (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: 20,
            height: 20,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px solid ${selected ? accent : "var(--luca-surface-hover)"}`,
            background: selected ? accent : "transparent",
          }}
        >
          {selected && (
            <Icon
              name="Check"
              size={12}
              style={{ color: "var(--luca-background-base)" }}
            />
          )}
        </span>
      )}
    </button>
  );
}

/** Tools shown before the grid is expanded — the desktop "first row". */
const CONNECTOR_DEFAULT_VISIBLE = 3;

/**
 * OnboardingConnectorPanel — the connector grid shown when the "Connect now"
 * path is chosen on the connect_tools screen. Every tool app is a compact,
 * selectable tile in one responsive auto-fill grid that lays as many per row as
 * the screen can fit (collapsing to a single column on mobile). To keep the
 * screen calm, only the first row shows by default; a disclosure reveals the
 * rest. Selecting tools here is presentational only — it marks them for setup
 * and grants no access.
 */
function OnboardingConnectorPanel({
  onSelectionChange,
  canConnect,
  onConnect,
}: {
  onSelectionChange?: (connectorIds: string[]) => void;
  /** When true, tiles launch the real connect flow instead of marking intent. */
  canConnect?: boolean;
  onConnect?: (connector: ConnectorCatalogEntry) => void;
}): React.ReactElement {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = React.useState(false);
  const toggle = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedCount = selectedIds.length;
  const onSelectionChangeRef = React.useRef(onSelectionChange);

  React.useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Report the selection up (intent only) so the flow can persist it. Keyed on
  // the stable joined id string so we don't fire on unrelated re-renders.
  const selectionKey = selectedIds.join(",");
  React.useEffect(() => {
    onSelectionChangeRef.current?.(selectionKey ? selectionKey.split(",") : []);
  }, [selectionKey]);

  // First-party connectors (same source as Settings) + any live MCP-registry
  // connectors, popular-first. Registry merge is best-effort and silent offline.
  const { connectors } = useOnboardingConnectors();
  const hiddenCount = connectors.length - CONNECTOR_DEFAULT_VISIBLE;
  const visible =
    expanded || hiddenCount <= 0
      ? connectors
      : connectors.slice(0, CONNECTOR_DEFAULT_VISIBLE);

  return (
    <div data-luca-onboarding-connectors style={{ margin: "18px 0 0" }}>
      <div
        id="luca-onboarding-connector-grid"
        data-luca-onboarding-connector-grid
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
          gap: 12,
        }}
      >
        {visible.map((connector) => (
          <ConnectorTile
            key={connector.id}
            connector={connector}
            selected={Boolean(selected[connector.id])}
            onToggle={toggle}
            canConnect={canConnect}
            onConnect={onConnect}
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          data-luca-onboarding-connectors-toggle
          data-luca-material-role="control"
          className="luca-shell-control"
          aria-expanded={expanded}
          aria-controls="luca-onboarding-connector-grid"
          onClick={() => setExpanded((v) => !v)}
          style={{
            ...lucaMaterialControlStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            margin: "12px 0 0",
            padding: "10px 14px",
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: "solid",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {expanded ? "Show fewer apps" : `Show ${hiddenCount} more apps`}
          <Icon
            name={expanded ? "ChevronUp" : "ChevronDown"}
            size={16}
            style={{ color: textTertiary }}
          />
        </button>
      )}

      <p
        role="note"
        style={{
          margin: "16px 0 0",
          fontSize: 12.5,
          lineHeight: 1.5,
          color: textTertiary,
        }}
      >
        {canConnect
          ? "Connect opens a secure sign-in for that app. You can also finish connecting later in Settings."
          : selectedCount > 0
            ? `${selectedCount} ${selectedCount === 1 ? "tool" : "tools"} selected. Nothing connects yet — you'll approve each connection in Settings after setup.`
            : "Pick the tools you'd like to set up. Nothing connects during onboarding — you approve each connection in Settings."}
      </p>
    </div>
  );
}

export const LucaOnboardingScreen: React.FC<LucaOnboardingScreenProps> = ({
  screenId,
  audienceMode = "basic",
  selectedOptionId,
  onSelectOption,
  onPrimary,
  onSecondary,
  onConnectorSelectionsChange,
  canConnectTools,
  onConnectorConnect,
  reducedMotion,
  faceSrc,
  stepIndex,
  stepTotal,
  onLearnMore,
  canGoBack,
  onBack,
  startupSurfaceSelections,
  onStartupSurfacesChange,
  className,
  style,
}) => {
  const copy = getPremiumOnboardingCopy(audienceMode).screens[screenId];

  // Welcome is a bespoke light hero (founder mockup), not the shared card
  // layout — it opens onboarding in the same glacier world as the boot.
  if (screenId === "welcome") {
    return (
      <WelcomeHero
        title={copy.title}
        summary={copy.summary}
        stepIndex={stepIndex}
        stepTotal={stepTotal}
        onPrimary={onPrimary}
        onLearnMore={onLearnMore}
        faceSrc={faceSrc}
        reducedMotion={reducedMotion}
        className={className}
        style={style}
      />
    );
  }
  const entry = getPremiumOnboardingScreenEntry(screenId);
  const activeOptionId = selectedOptionId ?? entry.defaultOptionId;
  const { primaryOptions, advancedOptions, advancedShownByDefault } =
    getLucaOnboardingDisclosure(audienceMode, copy.options);

  // Environment is the second bespoke light screen (founder mockup): the
  // "Choose your environment" skin picker on the same glacier as welcome.
  if (screenId === "environment") {
    return (
      <EnvironmentHero
        title={copy.title}
        summary={copy.summary}
        options={primaryOptions}
        selectedOptionId={activeOptionId}
        onSelectOption={onSelectOption}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        primaryCta={copy.primaryCta}
        secondaryCta={copy.secondaryCta}
        stepIndex={stepIndex}
        stepTotal={stepTotal}
        canBack={canGoBack}
        onBack={onBack}
        className={className}
        style={style}
      />
    );
  }

  // Presence is the third bespoke light screen: the surface picker rides the
  // same glacier chrome (HeroFrame) as welcome + environment.
  if (screenId === "presence") {
    return (
      <PresenceHero
        title={copy.title}
        summary={copy.summary}
        options={[...primaryOptions, ...advancedOptions]}
        startupSurfaceSelections={startupSurfaceSelections}
        onStartupSurfacesChange={onStartupSurfacesChange}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        primaryCta={copy.primaryCta}
        secondaryCta={copy.secondaryCta}
        stepIndex={stepIndex}
        stepTotal={stepTotal}
        canBack={canGoBack}
        onBack={onBack}
        reassurance={copy.reassurance}
        faceSrc={faceSrc}
        reducedMotion={reducedMotion}
        className={className}
        style={style}
      />
    );
  }

  // Trust + route screens (permission_style, memory_boundaries,
  // intelligence_route, connect_tools) share the centered ChoiceHero on the
  // same glacier; connect_tools reveals the connector panel when the user
  // chooses to connect now.
  if (
    screenId === "permission_style" ||
    screenId === "memory_boundaries" ||
    screenId === "intelligence_route" ||
    screenId === "connect_tools"
  ) {
    return (
      <ChoiceHero
        screenId={screenId}
        category={entry.category}
        title={copy.title}
        summary={copy.summary}
        options={primaryOptions}
        advancedOptions={advancedOptions}
        advancedShownByDefault={advancedShownByDefault}
        selectedOptionId={activeOptionId}
        onSelectOption={onSelectOption}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        primaryCta={copy.primaryCta}
        secondaryCta={copy.secondaryCta}
        stepIndex={stepIndex}
        stepTotal={stepTotal}
        canBack={canGoBack}
        onBack={onBack}
        footnote={copy.reassurance}
        className={className}
        style={style}
      >
        {screenId === "connect_tools" && activeOptionId === "connect_now" && (
          <div
            style={
              {
                width: "100%",
                maxWidth: 620,
                marginTop: 4,
                textAlign: "left",
                // The connector panel reads scoped --luca-* tokens (dark-skin
                // values); re-pin text + accent to the light hero ink so it
                // stays readable on the glacier.
                "--luca-text-primary": HERO_INK,
                "--luca-text-secondary": HERO_INK_2,
                "--luca-text-tertiary": "#8b929d",
                "--luca-accent-primary": HERO_ACCENT,
              } as React.CSSProperties
            }
          >
            <OnboardingConnectorPanel
              onSelectionChange={onConnectorSelectionsChange}
              canConnect={canConnectTools}
              onConnect={onConnectorConnect}
            />
          </div>
        )}
      </ChoiceHero>
    );
  }

  // Finish: the completion hero (welcome family) — the face at its warmest,
  // the ready copy, and the premium Enter LucaOS action.
  return (
    <FinishHero
      title={copy.title}
      summary={copy.summary}
      accessibilityLabel={copy.accessibilityLabel}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      primaryCta={copy.primaryCta}
      secondaryCta={copy.secondaryCta}
      stepIndex={stepIndex}
      stepTotal={stepTotal}
      canBack={canGoBack}
      onBack={onBack}
      faceSrc={faceSrc}
      reducedMotion={reducedMotion}
      className={className}
      style={style}
    />
  );
};
