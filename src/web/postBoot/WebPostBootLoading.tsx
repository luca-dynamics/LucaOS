import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";
import { LucaPanel } from "../../components/ui/luca";
import {
  lucaMaterialBorderSubtleStyle,
  lucaMaterialCardStyle,
  lucaMaterialHoverSurfaceStyle,
  lucaMaterialPrimaryTextStyle,
  lucaMaterialSecondaryTextStyle,
} from "../../styles/lucaMaterialSystem";
import { resolvePostBootReadinessBridgeCopy } from "./postBootReadinessBridgeCopy";
import { WebPostBootAmbientPresence } from "./WebPostBootAmbientPresence";

export function WebPostBootLoading() {
  const copy = resolvePostBootReadinessBridgeCopy({ state: "pending" });

  return (
    <section
      className="relative z-10 flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6"
      aria-live="polite"
      aria-busy="true"
    >
      <WebPostBootAmbientPresence />
      <LucaPanel className="relative z-10 w-full max-w-[30rem] rounded-[2rem] border px-5 py-8 text-center shadow-2xl backdrop-blur-2xl sm:px-8 sm:py-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border" style={lucaMaterialCardStyle} aria-hidden="true">
          <LucaCanvasPresenceOrb size={34} state="preparing" amplitude={0.12} lowPower />
        </div>

        <div className="mx-auto mt-7 max-w-sm">
          <h1 className="text-[1.7rem] font-medium leading-tight tracking-[-0.035em] sm:text-3xl" style={lucaMaterialPrimaryTextStyle}>
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-6 sm:text-[0.95rem]" style={lucaMaterialSecondaryTextStyle}>
            {copy.supportingCopy}
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-sm space-y-2.5 text-left">
          {copy.readinessLines.map((line) => (
            <div
              key={line}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 sm:px-5"
              style={{ ...lucaMaterialCardStyle, ...lucaMaterialBorderSubtleStyle, ...lucaMaterialHoverSurfaceStyle }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border" style={lucaMaterialBorderSubtleStyle} aria-hidden="true">
                <LucaCanvasPresenceOrb
                  size={16}
                  state="preparing"
                  amplitude={0.07}
                  lowPower
                />
              </span>
              <span className="text-sm leading-5" style={lucaMaterialSecondaryTextStyle}>{line}</span>
            </div>
          ))}
        </div>
      </LucaPanel>
    </section>
  );
}
