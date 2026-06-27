import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";
import { LucaStaticFacePresence } from "../../components/visual/LucaStaticFacePresence";
import {
  lucaMaterialBorderSubtleStyle,
  lucaMaterialCardStyle,
  lucaMaterialPrimaryTextStyle,
  lucaMaterialSecondaryTextStyle,
} from "../../styles/lucaMaterialSystem";
import { resolvePostBootReadinessBridgeCopy } from "./postBootReadinessBridgeCopy";
import { WebPostBootAmbientPresence } from "./WebPostBootAmbientPresence";
import { resolveLucaDashboardSkinBoundary } from "../../styles/lucaDashboardSkinBoundary";
import { readWebPremiumPreferences } from "../webLifecycleStorage";

/**
 * WebPostBootLoading — the calm "Preparing your LucaOS environment" screen,
 * redesigned to match the premium onboarding direction: the Luca hologram
 * identity (one being) is the hero, set on the resolved skin's screen background
 * (default Pearl), with a single quiet preparing pulse behind the face and an
 * unobtrusive readiness list. The previous layout used a small orb hero and an
 * animated orb on every readiness line, which read as busy/debug.
 *
 * The skin boundary is resolved here (stored skin, default Pearl) and its
 * material variables are scoped to this section so the post-boot screen shares
 * the same warm calm palette as onboarding instead of the cold default tokens.
 * Motion comes only from the LucaCanvasPresenceOrb component (which owns its own
 * canvas animation); this module adds no inline keyframes/intervals and mutates
 * no document/body/html.
 */
export function WebPostBootLoading() {
  const copy = resolvePostBootReadinessBridgeCopy({ state: "pending" });
  const skinBoundary = resolveLucaDashboardSkinBoundary({
    selectedSkinId: readWebPremiumPreferences()?.environment,
    hostKind: "desktop-web",
  });

  return (
    <section
      className="relative z-10 flex min-h-dvh w-full items-center justify-center overflow-y-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6"
      style={{
        ...skinBoundary.materialVariables,
        background: "var(--luca-background-base)",
        color: "var(--luca-text-primary)",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <WebPostBootAmbientPresence />
      <div className="relative z-10 flex w-full max-w-[34rem] flex-col items-center text-center">
        {/* Hologram identity hero with a single calm preparing pulse behind it. */}
        <div className="relative flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <LucaCanvasPresenceOrb
              size={150}
              state="preparing"
              amplitude={0.1}
              lowPower
            />
          </span>
          <LucaStaticFacePresence
            size={112}
            className="relative z-10 drop-shadow-xl"
          />
        </div>

        <div className="mx-auto mt-8 max-w-md">
          <h1
            className="font-display text-[1.85rem] font-semibold leading-tight tracking-[-0.035em] sm:text-[2.1rem]"
            style={lucaMaterialPrimaryTextStyle}
          >
            {copy.title}
          </h1>
          <p
            className="mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-[0.95rem]"
            style={lucaMaterialSecondaryTextStyle}
          >
            {copy.supportingCopy}
          </p>
        </div>

        {/* Calm readiness list — quiet rows, no per-line orbs. */}
        <ul className="mx-auto mt-9 w-full max-w-sm space-y-2.5 text-left">
          {copy.readinessLines.map((line) => (
            <li
              key={line}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3 sm:px-5"
              style={{ ...lucaMaterialCardStyle, ...lucaMaterialBorderSubtleStyle }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: "var(--luca-accent-primary, currentColor)",
                  opacity: 0.6,
                }}
                aria-hidden="true"
              />
              <span
                className="text-sm leading-5"
                style={lucaMaterialSecondaryTextStyle}
              >
                {line}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
