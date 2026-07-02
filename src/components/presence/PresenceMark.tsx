import React, { useEffect, useMemo, useRef } from "react";
import type { PresenceMarkState } from "../../presence/presenceMark";
import {
  LUCA_CADENCE,
  LUCA_SMOOTHING,
  approach,
  attentionPulse,
} from "../../styles/lucaPresenceMotion";
import { hexToRgb, mixRgb, rgba } from "./presenceColor";

/**
 * Luca's body at rest: a single point of light. State is expressed through
 * light and motion only — no text, no rings of chrome, no telemetry. The
 * glow drawn here is the one glow permitted anywhere in LucaOS.
 */

interface PresenceMarkProps {
  state: PresenceMarkState;
  /** Live voice energy, 0..1. Drives the halo while listening/speaking. */
  amplitude?: number;
  /** Resolved identity color (hex). Falls back to the skin accent token. */
  identityColor?: string;
  /** Rendered size in CSS pixels. */
  size?: number;
  onClick?: () => void;
  title?: string;
}

interface MarkParams {
  brightness: number;
  haloAlpha: number;
  haloScale: number;
  breathAmp: number;
  orbitAlpha: number;
  orbitSpeed: number;
  attention: number;
  energy: number;
}

const STATE_TARGETS: Record<PresenceMarkState, Omit<MarkParams, "energy">> = {
  idle: {
    brightness: 0.7,
    haloAlpha: 0.1,
    haloScale: 1.9,
    breathAmp: 0.045,
    orbitAlpha: 0,
    orbitSpeed: 0,
    attention: 0,
  },
  listening: {
    brightness: 1,
    haloAlpha: 0.26,
    haloScale: 2.3,
    breathAmp: 0,
    orbitAlpha: 0,
    orbitSpeed: 0,
    attention: 0,
  },
  speaking: {
    brightness: 0.9,
    haloAlpha: 0.2,
    haloScale: 2.1,
    breathAmp: 0,
    orbitAlpha: 0,
    orbitSpeed: 0,
    attention: 0,
  },
  thinking: {
    brightness: 0.85,
    haloAlpha: 0.16,
    haloScale: 2.0,
    breathAmp: 0.02,
    orbitAlpha: 0.9,
    orbitSpeed: 1,
    attention: 0,
  },
  acting: {
    brightness: 1,
    haloAlpha: 0.24,
    haloScale: 2.2,
    breathAmp: 0,
    orbitAlpha: 0.9,
    orbitSpeed: 2.2,
    attention: 0,
  },
  "needs-you": {
    brightness: 1,
    haloAlpha: 0.22,
    haloScale: 2.2,
    breathAmp: 0,
    orbitAlpha: 0,
    orbitSpeed: 0,
    attention: 1,
  },
};

const FALLBACK_IDENTITY = "#8a8f98";
const FALLBACK_ATTENTION = "#d9a441";

const PresenceMark: React.FC<PresenceMarkProps> = ({
  state,
  amplitude = 0,
  identityColor,
  size = 96,
  onClick,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef({ state, amplitude, identityColor });

  useEffect(() => {
    inputRef.current = { state, amplitude, identityColor };
  }, [state, amplitude, identityColor]);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const resolveColor = (variable: string, fallback: string) => {
      const value = getComputedStyle(container).getPropertyValue(variable).trim();
      return hexToRgb(value) ?? hexToRgb(fallback)!;
    };

    const params: MarkParams = {
      ...STATE_TARGETS.idle,
      energy: 0,
    };
    let orbitAngle = -Math.PI / 2;
    let lastTime = performance.now();
    let animationId = 0;

    const draw = (now: number) => {
      const dt = Math.min(now - lastTime, 64);
      lastTime = now;

      const input = inputRef.current;
      const target = STATE_TARGETS[input.state];
      const identity =
        (input.identityColor && hexToRgb(input.identityColor)) ||
        resolveColor("--luca-accent-primary", FALLBACK_IDENTITY);
      const attention = resolveColor("--luca-warning", FALLBACK_ATTENTION);

      params.brightness = approach(params.brightness, target.brightness, dt, LUCA_SMOOTHING.state);
      params.haloAlpha = approach(params.haloAlpha, target.haloAlpha, dt, LUCA_SMOOTHING.state);
      params.haloScale = approach(params.haloScale, target.haloScale, dt, LUCA_SMOOTHING.state);
      params.breathAmp = approach(params.breathAmp, target.breathAmp, dt, LUCA_SMOOTHING.state);
      params.orbitAlpha = approach(params.orbitAlpha, target.orbitAlpha, dt, LUCA_SMOOTHING.state);
      params.orbitSpeed = approach(params.orbitSpeed, target.orbitSpeed, dt, LUCA_SMOOTHING.state);
      params.attention = approach(params.attention, target.attention, dt, LUCA_SMOOTHING.state);

      const wantsEnergy =
        input.state === "listening" || input.state === "speaking";
      const energyTarget = wantsEnergy
        ? Math.max(0, Math.min(1, input.amplitude ?? 0))
        : 0;
      params.energy = approach(
        params.energy,
        energyTarget,
        dt,
        energyTarget > params.energy
          ? LUCA_SMOOTHING.amplitudeRise
          : LUCA_SMOOTHING.amplitudeFall,
      );

      orbitAngle +=
        (dt / (LUCA_CADENCE.orbit / (Math.PI * 2))) * params.orbitSpeed;

      const center = size / 2;
      const coreBase = size * 0.115;
      const breathPhase = reducedMotion
        ? 0
        : Math.sin((now / LUCA_CADENCE.breath) * Math.PI * 2);
      const pulse =
        params.attention > 0.01 && !reducedMotion
          ? attentionPulse(now) * params.attention
          : 0;

      const coreRadius =
        coreBase *
        (1 + params.breathAmp * breathPhase + params.energy * 0.22 + pulse * 0.08);
      const haloRadius =
        coreBase * params.haloScale * (1 + params.energy * 0.45) + pulse * (size * 0.06);
      const haloAlpha =
        (params.haloAlpha + params.energy * 0.18 + pulse * 0.2) *
        (reducedMotion && params.attention > 0.5 ? 1.4 : 1);

      const color = mixRgb(identity, attention, params.attention);

      ctx.clearRect(0, 0, size, size);

      const halo = ctx.createRadialGradient(
        center,
        center,
        coreRadius * 0.4,
        center,
        center,
        haloRadius,
      );
      halo.addColorStop(0, rgba(color, haloAlpha));
      halo.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(center, center, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgba(color, 0.55 + params.brightness * 0.45);
      ctx.beginPath();
      ctx.arc(center, center, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgba([255, 255, 255], 0.16 * params.brightness);
      ctx.beginPath();
      ctx.arc(
        center - coreRadius * 0.28,
        center - coreRadius * 0.28,
        coreRadius * 0.45,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      if (params.orbitAlpha > 0.02 && !reducedMotion) {
        const orbitRadius = coreBase * 1.75;
        const x = center + Math.cos(orbitAngle) * orbitRadius;
        const y = center + Math.sin(orbitAngle) * orbitRadius;
        ctx.fillStyle = rgba(color, params.orbitAlpha * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, size * 0.021, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [size, reducedMotion]);

  return (
    <div
      ref={containerRef}
      role={onClick ? "button" : "img"}
      aria-label={title ?? `Luca — ${state}`}
      onClick={onClick}
      title={title}
      className="relative flex items-center justify-center cursor-pointer group"
      style={
        {
          width: size,
          height: size,
          WebkitAppRegion: "no-drag",
        } as React.CSSProperties
      }
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="absolute inset-0 pointer-events-none"
      />
      <div
        className="absolute rounded-full border border-white/0 group-hover:border-white/15 pointer-events-none"
        style={{
          inset: size * 0.18,
          transitionProperty: "border-color",
          transitionDuration: "var(--luca-duration-fast, 160ms)",
          transitionTimingFunction: "var(--luca-ease, ease-out)",
        }}
      />
    </div>
  );
};

export default PresenceMark;
