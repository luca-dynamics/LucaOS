import { useEffect, useState } from "react";
import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";
import { LucaStaticFacePresence } from "../../components/visual/LucaStaticFacePresence";
import {
  lucaMaterialBorderSubtleStyle,
  lucaMaterialCardStyle,
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
  lucaMaterialHoverSurfaceStyle,
  lucaMaterialOverlayStyle,
  lucaMaterialPanelStyle,
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
    snapshot.userState === "permission_attention"
      ? onReviewVoiceAccess
      : onContinue;
  const secondaryAction =
    snapshot.userState === "permission_attention" ? onContinue : undefined;

  return (
    <section
      className="relative z-10 flex min-h-dvh w-full items-center justify-center overflow-y-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6"
      style={lucaMaterialOverlayStyle}
    >
      <div className="flex w-full max-w-[42rem] flex-col items-center text-center">
        <div className="w-full rounded-[2rem] border px-5 py-7 shadow-2xl backdrop-blur-2xl sm:px-8 sm:py-9" style={lucaMaterialPanelStyle}>
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border sm:h-40 sm:w-40" style={lucaMaterialCardStyle} aria-hidden="true">
            <LucaStaticFacePresence size={needsAttention ? 154 : 172} />
          </div>

          <div className="mx-auto mt-7 max-w-lg">
            <h1
              className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.04em] sm:text-4xl"
              style={lucaMaterialPrimaryTextStyle}
            >
              {copy.title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 sm:text-base" style={lucaMaterialSecondaryTextStyle}>
              {copy.supportingCopy}
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-lg space-y-2.5 text-left">
            {copy.readinessLines.map((line, index) => (
              <div key={line} className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 sm:px-5" style={{ ...lucaMaterialCardStyle, ...lucaMaterialBorderSubtleStyle, ...lucaMaterialHoverSurfaceStyle }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border" style={needsAttention ? lucaMaterialBorderSubtleStyle : lucaMaterialControlActiveStyle} aria-hidden="true">
                  <LucaCanvasPresenceOrb
                    size={18}
                    state={needsAttention ? "preparing" : "ready"}
                    amplitude={needsAttention ? 0.07 : isNewUser ? 0.1 + index * 0.015 : 0}
                    lowPower={needsAttention || index > 1}
                  />
                </span>
                <span className="text-sm leading-5" style={lucaMaterialSecondaryTextStyle}>{line}</span>
              </div>
            ))}
          </div>

          {needsAttention && (
            <div className="mx-auto mt-8 flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              {copy.primaryCta && primaryAction && (
                <button
                  className="rounded-full border px-6 py-3 text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  style={{ ...lucaMaterialControlActiveStyle, ...lucaMaterialHoverSurfaceStyle }}
                  onClick={primaryAction}
                >
                  {copy.primaryCta}
                </button>
              )}
              {copy.secondaryCta && secondaryAction && (
                <button
                  className="rounded-full border px-5 py-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  style={{ ...lucaMaterialControlStyle, ...lucaMaterialHoverSurfaceStyle }}
                  onClick={secondaryAction}
                >
                  {copy.secondaryCta}
                </button>
              )}
            </div>
          )}
        </div>

        <button
          className="mt-4 rounded-full px-3 py-2 text-xs underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          style={lucaMaterialTertiaryTextStyle}
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? "Hide details" : (copy.detailsLabel ?? "Details")}
        </button>

        {detailsOpen && (
          <dl className="mt-3 grid w-full max-w-lg grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 rounded-3xl border p-4 text-left text-xs shadow-xl backdrop-blur-xl sm:p-5" style={{ ...lucaMaterialPanelStyle, ...lucaMaterialBorderSubtleStyle }}>
            <dt style={lucaMaterialTertiaryTextStyle}>state</dt>
            <dd className="text-right" style={lucaMaterialSecondaryTextStyle}>{snapshot.userState}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>display name</dt>
            <dd className="text-right" style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.displayName)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>onboarding complete</dt>
            <dd className="text-right" style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.hasCompletedOnboarding)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>preferred interaction</dt>
            <dd className="text-right" style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.preferredInteraction)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>voice permission attention</dt>
            <dd className="text-right" style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.needsVoicePermission)}</dd>
            <dt style={lucaMaterialTertiaryTextStyle}>can enter shell</dt>
            <dd className="text-right" style={lucaMaterialSecondaryTextStyle}>{detailValue(snapshot.canEnterShell)}</dd>
          </dl>
        )}
      </div>
    </section>
  );
}
