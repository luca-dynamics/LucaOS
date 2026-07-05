import React from "react";
import {
  LucaPresence,
  type LucaPresenceState,
} from "../presence/LucaPresence";
import {
  LUCA_SKINS,
  isLucaSkinId,
  type LucaSkinHostKind,
  type LucaSkinId,
} from "../../config/lucaSkins";
import { getLucaSkinPreviewMetadata } from "../../config/lucaSkinPreviewMetadata";
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

/** Face size per screen — the presence rhythm. Hero, mark, glad. */
const SCREEN_FACE_SIZE: Record<PremiumOnboardingScreenId, number> = {
  welcome: 190,
  environment: 72,
  presence: 104,
  permission_style: 72,
  memory_boundaries: 72,
  connect_tools: 64,
  intelligence_route: 72,
  finish: 210,
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
  className?: string;
  style?: React.CSSProperties;
}

const textPrimary = "var(--luca-text-primary)";
const textSecondary = "var(--luca-text-secondary)";
const textTertiary = "var(--luca-text-tertiary)";
const accent = "var(--luca-accent-primary)";
const LUCA_BRAND_DISPLAY_STYLE: React.CSSProperties = {
  fontFamily:
    '"Segoe UI Variable Display", Inter, "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 650,
  letterSpacing: "-0.035em",
};

function OptionCard({
  option,
  checked,
  onSelect,
  onPreview,
}: {
  option: PremiumOnboardingOptionCopy;
  checked: boolean;
  onSelect?: (optionId: string) => void;
  onPreview?: (optionId: string | null) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-luca-onboarding-option={option.id}
      onClick={onSelect ? () => onSelect(option.id) : undefined}
      onMouseEnter={onPreview ? () => onPreview(option.id) : undefined}
      onMouseLeave={onPreview ? () => onPreview(null) : undefined}
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
function SkinOptionTile({
  option,
  checked,
  onSelect,
  onPreview,
}: {
  option: PremiumOnboardingOptionCopy;
  checked: boolean;
  onSelect?: (optionId: string) => void;
  onPreview?: (optionId: string | null) => void;
}): React.ReactElement {
  if (!isLucaSkinId(option.id)) {
    return (
      <OptionCard
        option={option}
        checked={checked}
        onSelect={onSelect}
        onPreview={onPreview}
      />
    );
  }

  const skin = LUCA_SKINS[option.id];
  const metadata = getLucaSkinPreviewMetadata(option.id);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-luca-onboarding-option={option.id}
      data-luca-onboarding-skin-option={option.id}
      onClick={onSelect ? () => onSelect(option.id) : undefined}
      onMouseEnter={onPreview ? () => onPreview(option.id) : undefined}
      onMouseLeave={onPreview ? () => onPreview(null) : undefined}
      style={{
        display: "flex",
        minHeight: 138,
        flexDirection: "column",
        gap: 10,
        textAlign: "left",
        cursor: onSelect ? "pointer" : "default",
        padding: 12,
        borderRadius: 16,
        border: `1px solid ${checked ? accent : "var(--luca-surface-hover)"}`,
        background: checked
          ? "var(--luca-surface-hover)"
          : "var(--luca-surface-glass)",
        color: textPrimary,
        boxShadow: checked ? "var(--luca-shadow-soft)" : "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "block",
          height: 42,
          width: "100%",
          borderRadius: 12,
          border: "1px solid var(--luca-surface-hover)",
          background: skin.backgroundProfile.hero,
          boxShadow: `inset 0 0 0 1px ${skin.accentProfile.glow}`,
        }}
      />
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {metadata.shortLabel}
        {option.recommended && (
          <span
            data-luca-onboarding-chip="recommended"
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 999,
              color: accent,
              border: `1px solid ${accent}`,
            }}
          >
            Default
          </span>
        )}
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.38, color: textSecondary }}>
        {metadata.tagline}
      </span>
    </button>
  );
}

function SurfaceMockupTile({
  option,
  checked,
  onSelect,
  onPreview,
}: {
  option: PremiumOnboardingOptionCopy;
  checked: boolean;
  onSelect?: (optionId: string) => void;
  onPreview?: (optionId: string | null) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-luca-onboarding-option={option.id}
      onClick={onSelect ? () => onSelect(option.id) : undefined}
      onMouseEnter={onPreview ? () => onPreview(option.id) : undefined}
      onMouseLeave={onPreview ? () => onPreview(null) : undefined}
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
      onClick={handleClick}
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
        border: `1px solid ${highlight ? accent : "var(--luca-surface-hover)"}`,
        background: highlight
          ? "var(--luca-surface-hover)"
          : "var(--luca-surface-glass)",
        boxShadow: highlight ? "var(--luca-shadow-soft)" : "none",
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

  // Report the selection up (intent only) so the flow can persist it. Keyed on
  // the stable joined id string so we don't fire on unrelated re-renders.
  const selectionKey = selectedIds.join(",");
  React.useEffect(() => {
    onSelectionChange?.(selectionKey ? selectionKey.split(",") : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  onPreviewOption,
  onPrimary,
  onSecondary,
  presenceState,
  nameValue,
  onNameChange,
  materialValue,
  onMaterialChange,
  onConnectorSelectionsChange,
  canConnectTools,
  onConnectorConnect,
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
        <LucaPresence
          state="identity"
          size={SCREEN_FACE_SIZE[screenId] ?? 104}
          label="Luca"
          wake={screenId === "welcome"}
          warm={screenId === "finish"}
          breathing
          {...presenceProps}
        />
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
          screenId === "presence"
            ? 980
            : screenId === "environment"
              ? 1040
              : screenId === "connect_tools"
                ? 900
                : 560,
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
          ...(copy.title.includes("LucaOS")
            ? LUCA_BRAND_DISPLAY_STYLE
            : {
                letterSpacing: "-0.02em",
                fontWeight: 650,
              }),
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

      {screenId === "environment" && onMaterialChange && materialValue && (
        <div
          data-luca-onboarding-material
          style={{ margin: "18px 0 0", textAlign: "left", display: "grid", gap: 12 }}
        >
          {[
            {
              key: "opacity" as const,
              label: "Background opacity",
              display: `${Math.round(materialValue.opacity * 100)}%`,
              min: 0, max: 100, value: Math.round(materialValue.opacity * 100),
              toChange: (v: number) => ({ opacity: v / 100 }),
            },
            {
              key: "blur" as const,
              label: "Background blur",
              display: `${materialValue.blur}px`,
              min: 0, max: 40, value: materialValue.blur,
              toChange: (v: number) => ({ blur: v }),
            },
          ].map((slider) => (
            <label key={slider.key} style={{ display: "block" }}>
              <span
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 600,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                <span>{slider.label}</span>
                <span>{slider.display}</span>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                value={slider.value}
                onChange={(event) =>
                  onMaterialChange(slider.toChange(Number(event.target.value)))
                }
                style={{ width: "100%", accentColor: "var(--luca-accent-primary)" }}
              />
            </label>
          ))}
        </div>
      )}

      {copy.options && copy.options.length > 0 && screenId === "environment" ? (
        <div
          role={entry.accessibilityRole === "radiogroup" ? "radiogroup" : "group"}
          aria-label={copy.detailsLabel ?? copy.title}
          data-luca-onboarding-options
          data-luca-onboarding-options-layout="skin-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            margin: "18px 0 0",
          }}
        >
          {[...primaryOptions, ...advancedOptions].map((option) => (
            <SkinOptionTile
              key={option.id}
              option={option}
              checked={option.id === activeOptionId}
              onSelect={onSelectOption}
              onPreview={onPreviewOption}
            />
          ))}
        </div>
      ) : copy.options && copy.options.length > 0 && screenId === "presence" ? (
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
              onPreview={onPreviewOption}
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
                  onPreview={onPreviewOption}
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
                  onPreview={onPreviewOption}
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
                  onPreview={onPreviewOption}
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
        <OnboardingConnectorPanel
          onSelectionChange={onConnectorSelectionsChange}
          canConnect={canConnectTools}
          onConnect={onConnectorConnect}
        />
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
