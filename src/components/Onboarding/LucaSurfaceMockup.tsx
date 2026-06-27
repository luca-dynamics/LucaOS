import React from "react";

/**
 * LucaSurfaceMockup — tiny, decorative CSS previews of each "Choose how Luca
 * appears" surface option, so the presence screen can showcase the surfaces
 * (Claude-style) rather than stack text-only cards.
 *
 * Pure and presentational: aria-hidden, no interactivity, no state, no images.
 * Every shape is drawn from the resolved --luca-* skin tokens so the mockups
 * recolor with the chosen skin. Unknown ids render an empty, sized frame so the
 * grid stays even.
 */

export interface LucaSurfaceMockupProps {
  surfaceId: string;
  /** Height of the preview frame in px (width fills the tile). */
  height?: number;
}

const frameStyle = (height: number): React.CSSProperties => ({
  height,
  width: "100%",
  borderRadius: 10,
  background: "var(--luca-background-elevated, var(--luca-surface-glass))",
  border: "1px solid var(--luca-surface-hover)",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const accent = "var(--luca-accent-primary)";
const soft = "var(--luca-surface-hover)";
const text = "var(--luca-text-tertiary)";

function bar(width: number | string, h = 6, color: string = soft): React.CSSProperties {
  return { width, height: h, borderRadius: 999, background: color };
}

const MOCKUPS: Record<string, React.ReactNode> = {
  // Small chat surface with two message lines.
  minichat: (
    <div
      style={{
        width: "62%",
        borderRadius: 8,
        border: "1px solid var(--luca-surface-hover)",
        background: "var(--luca-surface-glass)",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ ...bar("55%"), alignSelf: "flex-start" }} />
      <div style={{ ...bar("75%", 6, accent), alignSelf: "flex-end" }} />
      <div style={{ ...bar("40%"), alignSelf: "flex-start" }} />
    </div>
  ),

  // Voice waveform.
  voice: (
    <div style={{ display: "flex", alignItems: "center", gap: 4, height: "46%" }}>
      {[40, 70, 100, 60, 90, 50, 80, 35].map((h, i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: `${h}%`,
            borderRadius: 999,
            background: i % 2 === 0 ? accent : soft,
          }}
        />
      ))}
    </div>
  ),

  // Compact floating entry pill.
  widget: (
    <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          background: "var(--luca-surface-glass)",
          border: "1px solid var(--luca-surface-hover)",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        <span style={bar(18, 5, text)} />
      </span>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: accent }} />
    </div>
  ),

  // Ambient presence orb glow.
  presence: (
    <span
      style={{
        width: "42%",
        aspectRatio: "1 / 1",
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${accent}, transparent 72%)`,
        opacity: 0.85,
      }}
    />
  ),

  // Full dashboard: left rail, center, right rail.
  dashboard: (
    <div style={{ display: "flex", gap: 4, width: "78%", height: "62%" }}>
      <div style={{ width: "22%", borderRadius: 6, background: soft }} />
      <div style={{ flex: 1, borderRadius: 6, background: "var(--luca-surface-glass)", border: "1px solid var(--luca-surface-hover)" }} />
      <div style={{ width: "26%", borderRadius: 6, background: soft }} />
    </div>
  ),
};

export const LucaSurfaceMockup: React.FC<LucaSurfaceMockupProps> = ({
  surfaceId,
  height = 76,
}) => (
  <div data-luca-surface-mockup={surfaceId} aria-hidden="true" style={frameStyle(height)}>
    {MOCKUPS[surfaceId] ?? null}
  </div>
);

export default LucaSurfaceMockup;
