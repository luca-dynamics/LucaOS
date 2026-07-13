import React from "react";
import { LucaPresence, type LucaPresenceAmbientPosition } from "../presence/LucaPresence";
import {
  resolveLucaOnboardingSkinBoundary,
  type LucaOnboardingSkinBoundarySurface,
} from "../../styles/lucaOnboardingSkinBoundary";
import type { LucaSkinHostKind } from "../../config/lucaSkins";

/**
 * LucaOnboardingShell — the local skin/presence wrapper for the premium
 * onboarding flow (per docs/luca-onboarding-presence-visual-language-spec.md).
 *
 * It resolves the selected skin once via the pure
 * `resolveLucaOnboardingSkinBoundary` helper and spreads BOTH the material and
 * presence variable maps ONTO ITS OWN ROOT element — scoping every
 * `--luca-*` / `--luca-skin-presence-*` value to this subtree. Children (the
 * individual onboarding screens) then read those scoped variables and may
 * render `LucaPresence` in `identity`/`voice` states without re-resolving.
 *
 * Purity / boundary discipline:
 * - It is a local wrapper only. It does NOT write to `document.documentElement`,
 *   `body`, or `html`, does NOT call `style.setProperty`, and mounts no
 *   provider — the boundary stays scoped to this element.
 * - It is presentational and inert: it is not yet wired into App/routing; this
 *   is the reusable shell the staged onboarding screens will live inside.
 * - It carries no status/safety semantics; those remain dedicated surfaces.
 *
 * The ambient Luca presence (blurred face background) is rendered here, behind
 * content, because ambient is the "felt everywhere" layer. Identity and voice
 * presence belong to specific screen content and are placed by `children`.
 */

export interface LucaOnboardingShellProps {
  selectedSkinId?: unknown;
  hostKind?: LucaSkinHostKind;
  surface?: LucaOnboardingSkinBoundarySurface;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  /** User-chosen material (onboarding sliders) — overrides the skin defaults. */
  userMaterialOpacity?: number;
  userMaterialBlurPx?: number;
  /** Render the ambient blurred-face presence behind content (default true). */
  ambientPresence?: boolean;
  /** Where the ambient face sits behind content. */
  ambientPosition?: LucaPresenceAmbientPosition;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const LucaOnboardingShell: React.FC<LucaOnboardingShellProps> = ({
  selectedSkinId,
  hostKind,
  surface,
  reducedMotion,
  reducedTransparency,
  userMaterialOpacity,
  userMaterialBlurPx,
  ambientPresence = true,
  ambientPosition = "top-right",
  className,
  style,
  children,
}) => {
  const boundary = resolveLucaOnboardingSkinBoundary({
    selectedSkinId,
    hostKind,
    surface,
    reducedMotion,
    reducedTransparency,
    userMaterialOpacity,
    userMaterialBlurPx,
  });

  // Scope the resolved material + presence variables to this subtree only.
  const rootStyle: React.CSSProperties = {
    ...(boundary.materialVariables as React.CSSProperties),
    ...(boundary.presenceVariables as React.CSSProperties),
    position: "relative",
    overflow: "hidden",
    background: "var(--luca-background-base)",
    color: "var(--luca-text-primary)",
    ...style,
  };

  return (
    <div
      data-luca-onboarding-shell={boundary.surface}
      data-luca-onboarding-skin={boundary.skinId}
      className={className}
      style={rootStyle}
    >
      {ambientPresence && (
        <LucaPresence
          state="ambient"
          position={ambientPosition}
          skinId={boundary.skinId}
          hostKind={hostKind}
          reducedMotion={boundary.reducedMotion}
          reducedTransparency={boundary.reducedTransparency}
        />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          // The shell root clips overflow (to bound the ambient presence); the
          // content layer must therefore scroll on its own when a screen's
          // cards exceed the viewport, or the lower options become unreachable.
          maxHeight: "100dvh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default LucaOnboardingShell;
