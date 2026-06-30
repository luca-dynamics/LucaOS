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
import { Icon } from "../ui/Icon";
import {
  useOnboardingConnectors,
  type ConnectorCatalogEntry,
} from "./onboardingConnectors";

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
}: {
  connector: ConnectorCatalogEntry;
  selected: boolean;
  onToggle: (id: string) => void;
}): React.ReactElement {
  const iconSrc = connector.logo ?? connector.iconUrl;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={connector.name}
      data-luca-onboarding-connector={connector.id}
      data-luca-connector-selected={selected ? "true" : "false"}
      onClick={() => onToggle(connector.id)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        padding: "14px 16px",
        borderRadius: 14,
        border: `1px solid ${selected ? accent : "var(--luca-surface-hover)"}`,
        background: selected
          ? "var(--luca-surface-hover)"
          : "var(--luca-surface-glass)",
        boxShadow: selected ? "var(--luca-shadow-soft)" : "none",
        color: textPrimary,
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
function OnboardingConnectorPanel(): React.ReactElement {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = React.useState(false);
  const toggle = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectedCount = Object.values(selected).filter(Boolean).length;

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
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          data-luca-onboarding-connectors-toggle
          aria-expanded={expanded}
          aria-controls="luca-onboarding-connector-grid"
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            margin: "12px 0 0",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid var(--luca-surface-hover)",
            background: "var(--luca-surface-glass)",
            color: textSecondary,
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
        {selectedCount > 0
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
        <LucaPresence state="identity" size={104} label="Luca" {...presenceProps} />
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
        // The surface-picker ("presence") needs room for 5 cards across on
        // desktop; the connect_tools screen widens for its 2-up connector grid;
        // other text-led screens stay narrow for readability.
        maxWidth:
          screenId === "presence" ? 980 : screenId === "connect_tools" ? 900 : 560,
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
            What should I call you? (optional)
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
          // Responsive: stacked on mobile, 2-up on small screens, all 5 across on
          // desktop — so the whole screen fits without scrolling and the cards
          // get comfortable width instead of being crushed.
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          style={{ margin: "18px 0 0" }}
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

      {/* Connect-now path: reveal the expandable tool-app connector cards once
          the user chooses to connect now. Inert/honest — queues for Settings. */}
      {screenId === "connect_tools" && activeOptionId === "connect_now" && (
        <OnboardingConnectorPanel />
      )}

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
