import React, { useEffect, useState } from "react";
import {
  getLucaSkinPresenceVariables,
  type LucaSkinPresenceOptions,
} from "../../styles/lucaSkinPresence";

/**
 * LucaPresence — the onboarding "three-state presence" component.
 *
 * One being, three expressions (see
 * docs/luca-onboarding-presence-visual-language-spec.md):
 *
 * - `ambient`  — the hologram face as a heavily blurred, low-opacity background
 *                light source behind content. aria-hidden, never interactive.
 * - `identity` — the sharp hologram face as the hero (welcome / finish only).
 * - `voice`    — the presence orb (listening / dictation). NOTE: this renders a
 *                static, skin-tinted orb from the skin token; production may swap
 *                in the real Dictation/VoiceHUD canvas orb behind the same API.
 *
 * Purity: this component is presentational and inert. It resolves the selected
 * skin's presence variables and spreads them ONLY onto its own root element
 * (scoping them to this subtree). It does not write to `document.documentElement`,
 * call `style.setProperty`, mutate `:root`/`body`/`html`, register a provider, or
 * add motion. Skin/presence values come from the pure `lucaSkinPresence` resolver.
 *
 * It carries no status/safety semantics; danger/approval/voice-live/etc. remain
 * the responsibility of dedicated status surfaces, never this presence layer.
 */

export type LucaPresenceState = "ambient" | "identity" | "voice";

export type LucaPresenceAmbientPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

/** Default to the existing boot identity asset — do not introduce a new face. */
export const LUCA_PRESENCE_FACE_SRC = "/hologram.png";

export interface LucaPresenceProps extends LucaSkinPresenceOptions {
  /** Which presence expression to render. */
  state: LucaPresenceState;
  /** Ambient-only: where the blurred face sits behind content. */
  position?: LucaPresenceAmbientPosition;
  /** Diameter in px for `identity`/`voice` (face width / orb size). */
  size?: number;
  /** Face image source (defaults to the existing hologram identity). */
  faceSrc?: string;
  /** Accessible label for the `voice` orb (e.g. "Listening"). Ambient stays hidden. */
  label?: string;
  /** Identity-only: the face resolves out of the dark on mount (first light). */
  wake?: boolean;
  /** Identity-only: slow living breath (scale + bloom). Suppressed by reducedMotion. */
  breathing?: boolean;
  /** Identity-only: golden undertone + amber bloom — the being is glad. */
  warm?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const AMBIENT_POSITION_STYLE: Record<
  LucaPresenceAmbientPosition,
  React.CSSProperties
> = {
  "top-left": { top: "-12%", left: "-12%" },
  "top-right": { top: "-12%", right: "-12%" },
  "bottom-left": { bottom: "-14%", left: "-14%" },
  "bottom-right": { bottom: "-14%", right: "-14%" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

export const LucaPresence: React.FC<LucaPresenceProps> = ({
  state,
  position = "top-right",
  size,
  faceSrc = LUCA_PRESENCE_FACE_SRC,
  label,
  wake = false,
  breathing = false,
  warm = false,
  className,
  style,
  skinId,
  hostKind,
  reducedMotion,
  reducedTransparency,
}) => {
  // Scope the resolved skin presence variables to this subtree only.
  const presenceVars = getLucaSkinPresenceVariables({
    skinId,
    hostKind,
    reducedMotion,
    reducedTransparency,
  }) as React.CSSProperties;

  const rootStyle: React.CSSProperties = { ...presenceVars, ...style };

  if (state === "ambient") {
    // Ambient is the "felt everywhere" layer: a large, soft, blurred face that
    // reads as a background light source, not a small corner thumbnail. Default
    // to a viewport-relative size (capped) so it spans the surface; callers can
    // still pass an explicit px `size` to override.
    const faceWidth =
      size !== undefined ? `${size}px` : "min(78vw, 720px)";
    return (
      <div
        data-luca-presence="ambient"
        aria-hidden="true"
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
          ...rootStyle,
        }}
      >
        <img
          src={faceSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            width: faceWidth,
            height: "auto",
            opacity: "var(--luca-skin-presence-ambient-opacity)" as unknown as number,
            filter: "blur(var(--luca-skin-presence-ambient-blur))",
            mixBlendMode:
              "var(--luca-skin-presence-ambient-blend)" as React.CSSProperties["mixBlendMode"],
            ...AMBIENT_POSITION_STYLE[position],
          }}
        />
      </div>
    );
  }

  if (state === "voice") {
    const orbSize = size ?? 128;
    return (
      <div
        data-luca-presence="voice"
        role="img"
        aria-label={label ?? "Luca presence"}
        className={className}
        style={{
          width: `${orbSize}px`,
          height: `${orbSize}px`,
          borderRadius: "50%",
          background: "var(--luca-skin-presence-orb)",
          boxShadow:
            "0 24px 56px rgba(0,0,0,.35), inset 0 0 48px rgba(255,255,255,.22), inset 0 -22px 44px rgba(40,70,130,.32)",
          ...rootStyle,
        }}
      />
    );
  }

  // identity
  const faceWidth = size ?? 150;
  const animate = !reducedMotion;
  // Wake = the face resolving out of the dark (first light). A mount-tick
  // flips the class so the CSS filter transition narrates the focus.
  const [awake, setAwake] = useState(!wake || !animate);
  useEffect(() => {
    if (awake) return;
    const t = window.setTimeout(() => setAwake(true), 80);
    return () => window.clearTimeout(t);
  }, [awake]);
  const bloomColor = warm
    ? "var(--luca-warning, #d9a441)"
    : "var(--luca-accent-primary, #8fd3df)";
  return (
    <div
      data-luca-presence="identity"
      data-luca-presence-warm={warm ? "true" : undefined}
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...rootStyle,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "150%",
          height: "150%",
          borderRadius: "50%",
          background: `radial-gradient(closest-side, color-mix(in srgb, ${bloomColor} 26%, transparent), transparent 70%)`,
          opacity: "var(--luca-skin-presence-bloom)" as unknown as number,
          pointerEvents: "none",
          zIndex: 0,
          animation:
            breathing && animate
              ? "luca-presence-bloom-breath 5.2s ease-in-out infinite"
              : undefined,
          transition: "background 700ms ease",
        }}
      />
      <img
        src={faceSrc}
        alt={label ?? "Luca"}
        draggable={false}
        style={{
          position: "relative",
          zIndex: 1,
          width: `${faceWidth}px`,
          height: "auto",
          filter: awake
            ? warm
              ? "var(--luca-skin-presence-face-filter) sepia(0.22) brightness(1.06)"
              : "var(--luca-skin-presence-face-filter)"
            : "blur(22px) brightness(0.35) saturate(0.7)",
          transition: "filter 1600ms cubic-bezier(0.22, 0.88, 0.24, 1)",
          animation:
            breathing && animate
              ? "luca-presence-face-breath 5.2s ease-in-out infinite"
              : undefined,
        }}
      />
    </div>
  );
};

export default LucaPresence;
