import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";
import { LucaPanel } from "../../components/ui/luca";
import {
  lucaMaterialBorderSubtleStyle,
  lucaMaterialHoverSurfaceStyle,
  lucaMaterialPrimaryTextStyle,
  lucaMaterialSecondaryTextStyle,
} from "../../styles/lucaMaterialSystem";
import { resolvePostBootReadinessBridgeCopy } from "./postBootReadinessBridgeCopy";

export function WebPostBootLoading() {
  const copy = resolvePostBootReadinessBridgeCopy({ state: "pending" });

  return (
    <section
      className="relative z-10 flex min-h-dvh w-full items-center justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6"
      aria-live="polite"
      aria-busy="true"
    >
      <LucaPanel className="w-full max-w-md rounded-3xl border px-6 py-10 text-center backdrop-blur-xl">
        <div className="mx-auto mb-7 flex h-8 w-8 items-center justify-center" aria-hidden="true">
          <LucaCanvasPresenceOrb size={28} state="preparing" amplitude={0.14} lowPower />
        </div>
        <h1 className="text-2xl font-medium tracking-tight" style={lucaMaterialPrimaryTextStyle}>
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-6" style={lucaMaterialSecondaryTextStyle}>
          {copy.supportingCopy}
        </p>
        <div className="mx-auto mt-7 w-full max-w-xs space-y-2 text-left">
          {copy.readinessLines.map((line) => (
            <div
              key={line}
              className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{ ...lucaMaterialBorderSubtleStyle, ...lucaMaterialHoverSurfaceStyle }}
            >
              <LucaCanvasPresenceOrb
                size={18}
                state="preparing"
                amplitude={0.08}
                lowPower
                className="shrink-0"
              />
              <span className="text-sm" style={lucaMaterialSecondaryTextStyle}>{line}</span>
            </div>
          ))}
        </div>
      </LucaPanel>
    </section>
  );
}
