import React from "react";
import { usePresenceMarkLiveState } from "../../presence/usePresenceMarkLiveState";
import { LUCA_PRESENCE_FACE_SRC } from "./LucaPresence";
import type { PresenceMarkState } from "../../presence/presenceMark";

/**
 * The shell's presence anchor — the FACE, the brand identity, at rest in the
 * left-rail brand bar (owner decision: the face itself stays as the rail
 * anchor; it settles here at the end of onboarding and never leaves).
 *
 * Live state is expressed through the BLOOM, not by swapping bodies:
 * a whisper of accent when present, brighter while thinking/listening/
 * speaking/acting, amber when Luca needs you. Driven by the same nervous
 * system as before (usePresenceMarkLiveState + the priority bus).
 */

const BLOOM_BY_STATE: Record<
  PresenceMarkState,
  { color: string; strength: number }
> = {
  idle: { color: "var(--luca-accent-primary, #7aa2ff)", strength: 0.22 },
  thinking: { color: "var(--luca-accent-primary, #7aa2ff)", strength: 0.4 },
  listening: { color: "var(--luca-accent-primary, #7aa2ff)", strength: 0.5 },
  speaking: { color: "var(--luca-accent-primary, #7aa2ff)", strength: 0.45 },
  acting: { color: "var(--luca-accent-primary, #7aa2ff)", strength: 0.5 },
  "needs-you": { color: "var(--luca-warning, #d9a441)", strength: 0.55 },
};

const STATE_TITLE: Partial<Record<PresenceMarkState, string>> = {
  "needs-you": "Luca needs you",
  thinking: "Luca is thinking",
  listening: "Luca is listening",
  speaking: "Luca is speaking",
  acting: "Luca is working",
};

export const ShellPresenceMark: React.FC<{ size?: number }> = ({
  size = 24,
}) => {
  const state = usePresenceMarkLiveState();
  const bloom = BLOOM_BY_STATE[state] ?? BLOOM_BY_STATE.idle;

  return (
    <span
      role="img"
      aria-label={STATE_TITLE[state] ?? "Luca is present"}
      title={STATE_TITLE[state] ?? "Luca is present"}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-45%",
          borderRadius: "50%",
          background: `radial-gradient(closest-side, color-mix(in srgb, ${bloom.color} ${Math.round(bloom.strength * 100)}%, transparent), transparent 70%)`,
          animation: "luca-presence-bloom-breath 5.2s ease-in-out infinite",
          transition: "background 700ms ease",
          pointerEvents: "none",
        }}
      />
      <img
        src={LUCA_PRESENCE_FACE_SRC}
        alt=""
        draggable={false}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          animation: "luca-presence-face-breath 5.2s ease-in-out infinite",
        }}
      />
    </span>
  );
};

export default ShellPresenceMark;
