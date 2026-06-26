import React, { useState } from "react";
import { LucaPresence } from "../presence/LucaPresence";
import FaceScan from "./FaceScan";
import type { LucaSkinHostKind, LucaSkinId } from "../../config/lucaSkins";

/**
 * LucaFaceRecognitionMoment — the calm, conversational face-recognition step
 * (per docs/luca-onboarding-face-recognition-experience-spec.md, P5c).
 *
 * Luca, the being inhabiting this host, asks — in its own calm voice and with
 * its identity presence — to learn the owner's face so it can recognize them.
 * It is optional and never compulsory: "Maybe later" is a first-class path.
 * Recognition, not security. Consent and clarity come before the camera ever
 * turns on, and the actual capture reuses the existing FaceScan component.
 *
 * Boundary discipline: presentational. It composes LucaPresence + the existing
 * FaceScan capability and only invokes the provided callbacks; it adds no new
 * camera/storage plumbing, mounts no provider, and does not write to
 * document/body/html. It carries no status/safety semantics and is not a
 * security gate.
 */

export interface LucaFaceRecognitionMomentProps {
  userName?: string;
  /** Called with the captured face data (or null) when recognition completes. */
  onComplete: (faceData: string | null) => void;
  /** Called when the user declines or skips at any point. */
  onSkip: () => void;
  isLightTheme?: boolean;
  theme?: { primary: string; hex: string };
  skinId?: LucaSkinId | string;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
}

const textPrimary = "var(--luca-text-primary)";
const textSecondary = "var(--luca-text-secondary)";
const textTertiary = "var(--luca-text-tertiary)";
const accent = "var(--luca-accent-primary)";

export const LucaFaceRecognitionMoment: React.FC<
  LucaFaceRecognitionMomentProps
> = ({
  userName,
  onComplete,
  onSkip,
  isLightTheme,
  theme,
  skinId,
  hostKind,
  reducedMotion,
  reducedTransparency,
}) => {
  const [stage, setStage] = useState<"invite" | "capture">("invite");
  const greetingName = userName?.trim() ? `, ${userName.trim()}` : "";

  if (stage === "capture") {
    return (
      <div data-luca-face-moment data-luca-face-moment-stage="capture">
        <FaceScan
          hideHeader
          userName={userName?.trim() || ""}
          isLightTheme={isLightTheme ?? false}
          theme={theme}
          title="Learning your face"
          description={`Look at me for a second${greetingName} — I'm just learning your face so I know it's you. You can stop anytime.`}
          confirmMessage="Got it — I'll recognize you now."
          onComplete={onComplete}
          onSkip={onSkip}
        />
      </div>
    );
  }

  return (
    <section
      data-luca-face-moment
      data-luca-face-moment-stage="invite"
      aria-label="Let Luca learn your face"
      style={{ maxWidth: 460, margin: "0 auto", textAlign: "center", color: textPrimary }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <LucaPresence
          state="identity"
          label="Luca"
          skinId={skinId}
          hostKind={hostKind}
          reducedMotion={reducedMotion}
          reducedTransparency={reducedTransparency}
        />
      </div>

      <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, letterSpacing: "-0.02em", fontWeight: 650 }}>
        Mind if I learn your face?
      </h2>
      <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.5, color: textSecondary }}>
        Since I live on this device now, I can learn your face so I always know
        it&rsquo;s really you{greetingName}. It only takes a moment.
      </p>

      <p
        data-luca-face-moment-consent
        role="note"
        style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: textTertiary }}
      >
        I keep a face signature on this device only, never as a security lock,
        and you can ask me to forget it anytime in Settings.
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "24px 0 0" }}>
        <button
          type="button"
          data-luca-face-moment-cta="accept"
          onClick={() => setStage("capture")}
          style={{
            cursor: "pointer",
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
          Sure, learn my face
        </button>
        <button
          type="button"
          data-luca-face-moment-cta="skip"
          onClick={onSkip}
          style={{
            cursor: "pointer",
            padding: "11px 18px",
            borderRadius: 12,
            border: "1px solid var(--luca-surface-hover)",
            fontSize: 15,
            fontWeight: 500,
            color: textSecondary,
            background: "transparent",
          }}
        >
          Maybe later
        </button>
      </div>
    </section>
  );
};

export default LucaFaceRecognitionMoment;
