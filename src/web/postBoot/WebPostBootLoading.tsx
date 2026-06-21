import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";
import { LucaPanel } from "../../components/ui/luca";
import {
  lucaMaterialPrimaryTextStyle,
  lucaMaterialSecondaryTextStyle,
} from "../../styles/lucaMaterialSystem";

export function WebPostBootLoading() {
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
          Preparing LucaOS
        </h1>
        <p className="mt-3 text-sm leading-6" style={lucaMaterialSecondaryTextStyle}>
          Starting Luca&apos;s web session…
        </p>
      </LucaPanel>
    </section>
  );
}
