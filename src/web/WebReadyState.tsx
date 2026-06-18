import { LucaCanvasPresenceOrb } from "../components/visual/LucaCanvasPresenceOrb";
import { LucaStaticFacePresence } from "../components/visual/LucaStaticFacePresence";
import type { WebCapability } from "./browserHostCapabilities";

interface WebReadyStateProps {
  hostClass: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
  lucaLinkStatus: string;
  onContinueToShell: () => void;
}

export function WebReadyState({ onContinueToShell }: WebReadyStateProps) {
  return (
    <section className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
      <div
        className="w-full max-w-xl rounded-[2rem] border px-6 py-8 shadow-2xl backdrop-blur-2xl sm:px-10 sm:py-10"
        style={{
          color: "var(--app-text-main)",
          borderColor: "var(--app-border-main)",
          backgroundColor: "var(--app-bg-tint)",
        }}
      >
        <div className="mx-auto flex w-fit items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <LucaStaticFacePresence size={128} />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-muted)" }}>
          <LucaCanvasPresenceOrb size={18} state="ready" amplitude={0} lowPower />
          Workspace ready
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Luca is ready
        </h1>
        <p
          className="mx-auto mt-4 max-w-md text-sm leading-6 sm:text-base"
          style={{ color: "var(--app-text-muted)" }}
        >
          Your personal AI workspace is ready. Luca will carry your preferences,
          appearance, and selected mode into the workspace.
        </p>
        <button
          type="button"
          onClick={onContinueToShell}
          className="mt-8 w-full rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:brightness-110 focus:outline-none focus:ring-2 sm:w-auto sm:min-w-44"
          style={{
            color: "var(--app-text-main)",
            borderColor: "var(--app-primary)",
            backgroundColor: "var(--luca-accent-soft, var(--app-bg-tint))",
          }}
        >
          Open LucaOS
        </button>
      </div>
    </section>
  );
}
