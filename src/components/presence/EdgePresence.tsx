import React, { useMemo } from "react";
import "./presence.css";
import type { PresenceIntent } from "./presenceIntent";
import {
  presenceCssVariables,
  resolvePresenceTokens,
} from "../../config/quietMachineTokens";

export interface EdgePresenceProps {
  intent: PresenceIntent;
  /** Override color (defaults to --luca-accent-primary via the token layer). */
  color?: string;
  /** Override attention color (defaults to --luca-warning). */
  warningColor?: string;
  /** Corner radius in px — match the host window/screen radius. */
  radius?: number;
  reducedMotion?: boolean;
  highContrast?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Luca's presence expressed at the boundary of a surface — the screen/window
 * edge glowing as the body it inhabits (Apple's new-Siri move). This is the
 * embodiment counterpart to the <Presence> orb: drop it into any
 * position:relative container (a device frame, the app shell root, a panel) and
 * it wraps that surface in a single token-driven light that breathes/pulses by
 * intent.
 *
 * It is purely decorative (pointer-events: none, aria-hidden) — the orb and
 * status copy carry the accessible meaning.
 */
export const EdgePresence: React.FC<EdgePresenceProps> = ({
  intent,
  color,
  warningColor,
  radius = 16,
  reducedMotion = false,
  highContrast = false,
  className,
  style,
}) => {
  const tokens = useMemo(
    () =>
      resolvePresenceTokens({
        intent,
        accentPrimary: color,
        warning: warningColor,
        reducedMotion,
        highContrast,
      }),
    [intent, color, warningColor, reducedMotion, highContrast],
  );

  const { color: edgeColor, blurPx } = tokens.edge;
  const cssVars = presenceCssVariables(tokens) as React.CSSProperties;

  return (
    <div
      className={`lp-edge${reducedMotion ? " lp-edge-static" : ""}${
        className ? ` ${className}` : ""
      }`}
      data-intent={intent}
      aria-hidden="true"
      style={{
        ...cssVars,
        borderRadius: radius,
        borderColor: edgeColor,
        boxShadow: `0 0 ${blurPx}px ${edgeColor}, inset 0 0 ${Math.round(
          blurPx * 1.35,
        )}px ${edgeColor}`,
        ...style,
      }}
    />
  );
};

export default EdgePresence;
