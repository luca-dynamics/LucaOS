import React from "react";

export interface LucaGlyphProps {
  size?: number;
  /** Stroke/fill color. Defaults to currentColor so it inherits text color. */
  color?: string;
  /** Render the wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
  title?: string;
}

/**
 * The Luca mark — a calm distillation of the holographic face (ring + core +
 * visor arc) for chrome, the incarnation boot, menu bar, and favicons. This is
 * the restrained, Quiet Machine identity that replaces the green-terminal BIOS
 * wordmark. It is deliberately static and monochrome; the living, animated
 * identity is <Presence>.
 */
export const LucaGlyph: React.FC<LucaGlyphProps> = ({
  size = 26,
  color = "currentColor",
  withWordmark = false,
  className,
  title = "LucaOS",
}) => {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      role="img"
      aria-label={withWordmark ? undefined : title}
      aria-hidden={withWordmark ? true : undefined}
      fill="none"
    >
      <circle
        cx="14"
        cy="14"
        r="12"
        stroke={color}
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />
      <circle cx="14" cy="14" r="4.2" fill={color} fillOpacity="0.9" />
      <path
        d="M8 17.5 A7 7 0 0 0 20 17.5"
        stroke={color}
        strokeOpacity="0.5"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!withWordmark) {
    return <span className={className}>{mark}</span>;
  }

  return (
    <span
      className={className}
      role="img"
      aria-label={title}
      style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
    >
      {mark}
      <span style={{ fontSize: size * 0.58, letterSpacing: "0.01em", color }}>
        luca
        <span style={{ color, opacity: 0.5 }}>os</span>
      </span>
    </span>
  );
};

export default LucaGlyph;
