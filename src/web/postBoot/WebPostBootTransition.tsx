import { useEffect, useState } from "react";
import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";
import { LucaStaticFacePresence } from "../../components/visual/LucaStaticFacePresence";
import {
  lucaMaterialBorderSubtleStyle,
  lucaMaterialHoverSurfaceStyle,
  lucaMaterialPrimaryTextStyle,
  lucaMaterialSecondaryTextStyle,
  lucaMaterialTertiaryTextStyle,
} from "../../styles/lucaMaterialSystem";
import { resolvePostBootReadinessBridgeCopy } from "./postBootReadinessBridgeCopy";
import type { WebPostBootStateSnapshot } from "./webPostBootState";

interface WebPostBootTransitionProps {
  snapshot: WebPostBootStateSnapshot;
  onContinue: () => void;
  onRestartOnboarding: () => void;
  onReviewVoiceAccess?: () => void;
  onChooseModelRoute?: () => void;
}

function detailValue(value: string | boolean | undefined): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  return value || "not set";
}

export function WebPostBootTransition({
  snapshot,
  onContinue,
  onRestartOnboarding,
  onReviewVoiceAccess,
}: WebPostBootTransitionProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const copy = resolvePostBootReadinessBridgeCopy({ state: snapshot.userState });
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

  const primaryAction =
    snapshot.userState === "partial_setup"
      ? onRestartOnboarding
      : snapshot.userState === "permission_attention"
        ? onReviewVoiceAccess
        : onContinue;
  const secondaryAction =
    snapshot.userState === "permission_attention" ? onContinue : undefined;

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
          {copy.title}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 sm:text-base" style={lucaMaterialSecondaryTextStyle}>
          {copy.supportingCopy}
        </p>

        <div className="mt-8 w-full max-w-md space-y-2 text-left">
          {copy.readinessLines.map((line, index) => (
            <div key={line} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ ...lucaMaterialBorderSubtleStyle, ...lucaMaterialHoverSurfaceStyle }}>
              <LucaCanvasPresenceOrb
                size={22}
                state={needsAttention ? "preparing" : "ready"}
                amplitude={needsAttention ? 0.08 : isNewUser ? 0.12 + index * 0.02 : 0}
                lowPower={needsAttention || index > 1}
                className="shrink-0"
              />
              <span className="text-sm" style={lucaMaterialSecondaryTextStyle}>{line}</span>
            </div>
          ))}
        </div>

        {needsAttention && (
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            {copy.primaryCta && primaryAction && (
              <button
                className="rounded-full border px-5 py-3 text-sm font-medium"
                style={{ ...lucaMaterialPrimaryTextStyle, ...lucaMaterialBorderSubtleStyle, ...lucaMaterialHoverSurfaceStyle }}
                onClick={primaryAction}
              >
                {copy.primaryCta}
              </button>
            )}
            {copy.secondaryCta && secondaryAction && (
              <button
                className="rounded-full px-5 py-3 text-sm"
                style={lucaMaterialSecondaryTextStyle}
                onClick={secondaryAction}
              >
                {copy.secondaryCta}
              </button>
            )}
          </div>
        )}

        <button
          className="mt-5 text-xs underline-offset-4 hover:underline"
          style={lucaMaterialTertiaryTextStyle}
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? "Hide details" : (copy.detailsLabel ?? "Details")}
        </button>

        {detailsOpen && (
          <dl className="mt-4 grid w-full max-w-md grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-2xl border p-4 text-left text-xs" style={{ ...lucaMaterialBorderSubtleStyle, ...lucaMaterialHoverSurfaceStyle }}>
            <dt style={lucaMaterialTertiaryTextStyle}>state</dt>
            <dd style={lucaMaterialSecondaryTextStyle}>{snapshot.userState}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>display name</dt>
            <dd style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.displayName)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>onboarding complete</dt>
            <dd style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.hasCompletedOnboarding)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>preferred interaction</dt>
            <dd style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.preferredInteraction)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>voice permission attention</dt>
            <dd style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.needsVoicePermission)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>can enter shell</dt>
            <dd style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.canEnterShell)}</dd>
          </dl>
        )}
      </div>
    </section>
  );
}
