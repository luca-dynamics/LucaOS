import { useEffect } from "react";
import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";
import { LucaStaticFacePresence } from "../../components/visual/LucaStaticFacePresence";
import {
  lucaMaterialBorderSubtleStyle,
  lucaMaterialHoverSurfaceStyle,
  lucaMaterialPrimaryTextStyle,
  lucaMaterialSecondaryTextStyle,
  lucaMaterialTertiaryTextStyle,
} from "../../styles/lucaMaterialSystem";
import type { WebPostBootStateSnapshot } from "./webPostBootState";

interface WebPostBootTransitionProps {
  snapshot: WebPostBootStateSnapshot;
  onContinue: () => void;
  onRestartOnboarding: () => void;
  onReviewVoiceAccess?: () => void;
  onChooseModelRoute?: () => void;
}

const NEW_USER_ROWS = [
  "Preparing memory context",
  "Loading interaction preferences",
  "Starting chat and voice interface",
  "Securing this session",
];

const RETURNING_USER_ROWS = [
  "Restoring memory context",
  "Syncing preferences",
  "Checking LucaLink readiness",
  "Preparing chat and voice",
];

export function WebPostBootTransition({
  snapshot,
  onContinue,
  onRestartOnboarding,
  onReviewVoiceAccess,
  onChooseModelRoute,
}: WebPostBootTransitionProps) {
  const needsAttention = ["partial_setup", "permission_attention"].includes(
    snapshot.userState,
  );
  const isNewUser = snapshot.userState === "new_user";

  useEffect(() => {
    if (needsAttention) return;
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const duration = reducedMotion ? 150 : isNewUser ? 1600 : 1100;
    const timer = window.setTimeout(onContinue, duration);
    return () => window.clearTimeout(timer);
  }, [isNewUser, needsAttention, onContinue]);

  const heading = isNewUser
    ? "Preparing LucaOS"
    : `Welcome back${snapshot.displayName ? `, ${snapshot.displayName}` : ""}`;
  const subheading = needsAttention
    ? "Some setup needs attention before Luca continues."
    : isNewUser
      ? "Luca is setting up your personal AI environment."
      : "Restoring your LucaOS workspace.";
  const rows = isNewUser ? NEW_USER_ROWS : RETURNING_USER_ROWS;

  return (
    <section className="relative z-10 flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-black/20 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <div className="mb-3 flex items-center justify-center">
          <LucaStaticFacePresence size={220} />
        </div>

        <h1
          className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
          style={lucaMaterialPrimaryTextStyle}
        >
          {heading}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 sm:text-base" style={lucaMaterialSecondaryTextStyle}>
          {subheading}
        </p>

        {needsAttention ? (
          <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-2">
            <button className="rounded-2xl border bg-[var(--luca-surface-glass,var(--app-bg-tint))] p-4 text-left text-sm transition hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]" style={{ ...lucaMaterialPrimaryTextStyle, ...lucaMaterialBorderSubtleStyle }} onClick={onContinue}>
              <span className="block font-medium">Continue with limited mode</span>
              <span className="mt-1 block text-xs" style={lucaMaterialTertiaryTextStyle}>Open LucaOS with voice features paused.</span>
            </button>
            <button className="rounded-2xl border bg-[var(--luca-surface-glass,var(--app-bg-tint))] p-4 text-left text-sm transition hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]" style={{ ...lucaMaterialPrimaryTextStyle, ...lucaMaterialBorderSubtleStyle }} onClick={onReviewVoiceAccess}>
              <span className="block font-medium">Review voice access</span>
              <span className="mt-1 block text-xs" style={lucaMaterialTertiaryTextStyle}>Check browser microphone permissions.</span>
            </button>
            <button className="rounded-2xl border bg-[var(--luca-surface-glass,var(--app-bg-tint))] p-4 text-left text-sm transition hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]" style={{ ...lucaMaterialPrimaryTextStyle, ...lucaMaterialBorderSubtleStyle }} onClick={onChooseModelRoute}>
              <span className="block font-medium">Choose model route</span>
              <span className="mt-1 block text-xs" style={lucaMaterialTertiaryTextStyle}>Continue setup with a supported route.</span>
            </button>
            <button className="rounded-2xl border bg-[var(--luca-surface-glass,var(--app-bg-tint))] p-4 text-left text-sm transition hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]" style={{ ...lucaMaterialPrimaryTextStyle, ...lucaMaterialBorderSubtleStyle }} onClick={onRestartOnboarding}>
              <span className="block font-medium">Restart onboarding</span>
              <span className="mt-1 block text-xs" style={lucaMaterialTertiaryTextStyle}>Review your LucaOS setup from the start.</span>
            </button>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-md space-y-2 text-left">
            {rows.map((row, index) => (
              <div key={row} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ ...lucaMaterialBorderSubtleStyle, ...lucaMaterialHoverSurfaceStyle }}>
                <LucaCanvasPresenceOrb
                  size={22}
                  state={isNewUser ? "preparing" : "ready"}
                  amplitude={isNewUser ? 0.12 + index * 0.02 : 0}
                  lowPower={index > 1}
                  className="shrink-0"
                />
                <span className="text-sm" style={lucaMaterialSecondaryTextStyle}>{row}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
