import React, { useEffect, useMemo, useRef, useState } from "react";
import "./presence.css";
import {
  isAudioReactiveIntent,
  presenceAriaLabel,
  type PresenceIntent,
} from "./presenceIntent";
import {
  presenceCssVariables,
  resolvePresenceTokens,
} from "../../config/quietMachineTokens";
import { eventBus, type AudioAmplitudeEvent } from "../../services/eventBus";

export interface PresenceProps {
  intent: PresenceIntent;
  /** Diameter in px. */
  size?: number;
  /** Override color (defaults to --luca-accent-primary via the token layer). */
  color?: string;
  /** Override attention color (defaults to --luca-warning). */
  warningColor?: string;
  /** Subscribe to the audio bus so the orb breathes with the voice. */
  reactToAudio?: boolean;
  /** Force-suppress motion (in addition to the OS prefers-reduced-motion). */
  reducedMotion?: boolean;
  /** Tighten the edge and drop ambient glow. */
  highContrast?: boolean;
  /** Replaces the derived aria-label when you need bespoke phrasing. */
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const AMPLITUDE_SMOOTHING = 0.15; // matches HolographicFaceIcon for a shared feel

const usePrefersReducedMotion = (forced?: boolean): boolean => {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return Boolean(forced) || prefers;
};

/**
 * Luca's embodied presence — one mark that morphs by intent.
 *
 * Replaces the per-state VoiceStatusOrb labels and the glitch/scanline
 * HolographicFaceIcon with a single calm, token-driven SVG. Color, motion, and
 * glow all come from the resolved appearance (Quiet Machine). When `reactToAudio`
 * is set and the intent is listening/speaking, the orb breathes with the live
 * amplitude from the event bus.
 */
export const Presence: React.FC<PresenceProps> = ({
  intent,
  size = 92,
  color,
  warningColor,
  reactToAudio = true,
  reducedMotion,
  highContrast = false,
  ariaLabel,
  className,
  style,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion(reducedMotion);

  const tokens = useMemo(
    () =>
      resolvePresenceTokens({
        intent,
        accentPrimary: color,
        warning: warningColor,
        reducedMotion: prefersReducedMotion,
        highContrast,
      }),
    [intent, color, warningColor, prefersReducedMotion, highContrast],
  );

  // Live amplitude → --pm-amp, smoothed and applied directly to the node so we
  // never re-render on every audio frame.
  useEffect(() => {
    const node = svgRef.current;
    const active =
      reactToAudio && !prefersReducedMotion && isAudioReactiveIntent(intent);
    if (!node) return;
    if (!active) {
      node.style.setProperty("--pm-amp", "0");
      return;
    }

    let raf = 0;
    let target = 0;
    let smoothed = 0;
    const onAmplitude = (data: AudioAmplitudeEvent) => {
      target = data?.amplitude ?? 0;
    };
    eventBus.on("audio-amplitude", onAmplitude);

    const tick = () => {
      smoothed += (target - smoothed) * AMPLITUDE_SMOOTHING;
      const normalized = Math.min(1, Math.max(0, smoothed / 255));
      node.style.setProperty("--pm-amp", normalized.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      eventBus.off("audio-amplitude", onAmplitude);
      cancelAnimationFrame(raf);
      node.style.setProperty("--pm-amp", "0");
    };
  }, [intent, reactToAudio, prefersReducedMotion]);

  const cssVars = presenceCssVariables(tokens) as React.CSSProperties;
  const label = ariaLabel ?? presenceAriaLabel(intent);

  return (
    <span
      className={`lp-root${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={label}
      style={style}
    >
      <svg
        ref={svgRef}
        className={`lp-svg${prefersReducedMotion ? " lp-static" : ""}`}
        data-intent={intent}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={cssVars}
      >
        <circle className="lp-glow" cx="50" cy="50" r="30" />

        <g className="lp-ripple">
          <circle cx="50" cy="50" r="18" strokeWidth="2" />
          <circle cx="50" cy="50" r="18" strokeWidth="2" />
          <circle cx="50" cy="50" r="18" strokeWidth="2" />
        </g>

        <path
          className="lp-spark"
          d="M50 16 C54 42 58 46 84 50 C58 54 54 58 50 84 C46 58 42 54 16 50 C42 46 46 42 50 16 Z"
        />

        <g className="lp-orbit">
          <circle cx="50" cy="13" r="4" />
        </g>

        <g className="lp-wave">
          <rect x="40" y="38" width="5" height="24" rx="2.5" />
          <rect x="47.5" y="38" width="5" height="24" rx="2.5" />
          <rect x="55" y="38" width="5" height="24" rx="2.5" />
        </g>

        <g className="lp-amp">
          <circle className="lp-core" cx="50" cy="50" r="15" />
        </g>
      </svg>
      <span
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </span>
  );
};

export default Presence;
